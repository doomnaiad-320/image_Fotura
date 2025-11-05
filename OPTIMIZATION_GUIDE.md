# 生产环境优化与 SQLite → MySQL 上线落地指南

本文档旨在帮助在开发阶段采用 SQLite、生产采用 MySQL 的项目，安全、可观测、可回滚地完成上线与持续优化。

---

## 1. 路径选择与结论

有两条典型路径：

- A. 以 MySQL 为中心（推荐）
  - 开发/预生产/生产都使用 MySQL（本地可用 Docker 启动开发库）。
  - 好处：环境一致性高，避免 SQLite 与 MySQL 的语义差异导致“上线才暴露”的问题。
- B. 开发使用 SQLite，预生产/生产使用 MySQL（你当前的方式）
  - 好处：开发零依赖、启动快。
  - 代价：需要额外的“兼容性校验与预生产回归”，并维护一套更严格的迁移与验证流程。

推荐：若允许，尽量转向 A；若必须采用 B，则强制执行“预生产 MySQL 回归 + 迁移脚本审阅 + 索引与外键验证 + 慢查检视”的流程（详见第 10 节上线清单）。

---

## 2. SQLite 与 MySQL 的关键差异清单（必须规避）

- 外键与约束
  - SQLite 需 `PRAGMA foreign_keys = ON` 才严格生效；MySQL InnoDB 默认严格。
  - 结论：模型中必须显式声明外键与唯一约束，并在预生产用 MySQL 校验。
- 类型与长度
  - `VARCHAR` 长度、`DECIMAL` 精度、`BOOLEAN`、`JSON`、自增主键语义不同。
  - 结论：`utf8mb4` 下唯一索引列长度最好 ≤ 191；小心 `DECIMAL(18,2)` 等精度。
- 排序规则/大小写
  - MySQL 常用 `utf8mb4_0900_ai_ci`（不区分大小写）；SQLite 行为不同。
  - 结论：对大小写敏感的逻辑在应用层明确化。
- 事务与锁
  - MySQL 行级锁、隔离级别与执行计划与 SQLite 不同。
  - 结论：长事务拆分为小事务；热点更新做好重试与排队。
- 执行计划
  - MySQL 索引/统计信息对性能影响显著；SQLite 习惯在小数据量“看起来很快”。
  - 结论：上线前对关键查询跑 `EXPLAIN`/`EXPLAIN ANALYZE`。

---

## 3. 数据库与 Prisma 配置基线

- MySQL 版本：8.0（InnoDB）
- 字符集/排序：`utf8mb4` / `utf8mb4_0900_ai_ci`
- 时区：统一 UTC；应用层做展示转换。
- SQL 模式：启用严格模式，如 `STRICT_TRANS_TABLES,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION`。
- Prisma `schema.prisma`
  ```prisma
  datasource db {
    provider = "mysql"
    url      = env("DATABASE_URL")
  }
  generator client {
    provider = "prisma-client-js"
  }
  ```
- 连接字符串建议参数：`connection_limit`、`socket_timeout`、生产强制 `ssl`。

---

## 4. 索引与模型设计建议

- 外键字段必须建索引；高频过滤/排序列建索引；复合索引顺序与查询谓词一致。
- 利用覆盖索引减少回表；全表扫描查询改写或增加索引。
- 大文本检索用 FULLTEXT（或接入 Meilisearch/Elastic）。
- 典型 Prisma 片段：
  ```prisma
  model User {
    id        BigInt   @id @default(autoincrement())
    email     String   @unique @db.VarChar(191)
    createdAt DateTime @default(now())

    @@index([createdAt])
  }

  model Item {
    id         BigInt   @id @default(autoincrement())
    ownerId    BigInt
    slug       String   @db.VarChar(191)
    status     String   @db.VarChar(50)
    createdAt  DateTime @default(now())

    @@index([ownerId, status, createdAt])
    @@unique([ownerId, slug])
  }
  ```

---

## 5. 迁移与环境策略（支持 B 路径）

- 模型变更流程
  1) 在开发环境完成模型定义（保持与 MySQL 兼容）。
  2) 生成可审阅 SQL（对 MySQL）：
     ```bash
     npx prisma migrate diff \
       --from-url "file:./prisma/dev.db" \
       --to-url   "mysql://user:pass@host:3306/db" \
       --script > prisma/migrations/20xx_mysql_migration.sql
     ```
  3) 在预生产 MySQL 审阅并执行该 SQL，验证外键/唯一/索引与数据兼容性。
  4) 生产采用 `npx prisma migrate deploy` 或执行已审阅 SQL。
- 数据导入（可选）
  - 小数据：SQLite 导出 CSV → MySQL `LOAD DATA` 导入（注意转义/自增/时区/顺序）。
  - 中大数据：编写一次性迁移脚本（流式读取、分批写入、失败重试、校验校对）。

---

## 6. 查询与事务优化

- 用 `EXPLAIN` 检查是否命中索引、扫描行数、回表成本；对慢查询落地索引或改写。
- 避免 N+1：批量查询、JOIN/IN；尽量减少循环内单条查询。
- 事务短小化：大批量写入分批，避免长时间锁；必要时采用队列化。
- 幂等写入：用唯一索引约束 + UPSERT，减少重复写入逻辑复杂度。

---

## 7. 连接与并发控制

- Prisma Client 单例复用，避免冷启动过度建连。
- `connection_limit` 与 MySQL `max_connections` 协调；高并发可引入 ProxySQL/托管池。
- 应用层限流与排队；外部 API/模型调用做好超时与重试，避免连接挤占。

---

## 8. 缓存与静态加速

- Redis 缓存热点数据（短 TTL + 主动失效）；只读接口结合 SWR。
- Next.js `fetch` 缓存与 `revalidate`；对静态资源与图片接入 CDN。
- 去重与幂等键：长任务/生成任务入队，利用状态机减少重复执行。

---

## 9. 观测、告警与容量

- MySQL：慢查询日志、连接数、缓冲命中、锁等待、IOPS。
- 应用：APM（OpenTelemetry/Datadog/Sentry）、p95/p99 延迟、错误率、队列深度。
- 仪表盘与告警门限：CPU/内存/磁盘/连接/慢查比例。

---

## 10. 上线执行清单（B 路径适配）

1) 准备
- 创建 MySQL 实例，最小权限账户、仅内网可达、TLS 开启。
- 统一字符集/排序/时区/SQL 模式；设置慢查询日志。

2) Schema 落地
- 生成并审阅针对 MySQL 的迁移 SQL（见第 5 节）。
- 预生产 MySQL 执行迁移 → 回归测试（含数据写入/读出/并发场景）。

3) 应用配置与灰度
- 设置 `.env` 的 `DATABASE_URL` 与相关密钥（生产使用 KMS/Secret Manager）。
- 首次小流量灰度（5%），观测错误率与 p95/p99；慢查占比 < 阈值后扩大流量。

4) 验证与收尾
- 验证关键路径数据一致性；落地备份/告警策略；记录基线指标。

---

## 11. 回滚预案

- 代码回滚：保留旧版本镜像/产物，回滚后指回旧数据库/或同库旧 schema。
- 数据回滚：启用二进制日志（ROW），保留 7 天；冷备 + 快照并演练恢复。
- 迁移回滚：为 destructive 变更准备反向脚本或采用影子表/蓝绿表策略。

---

## 12. 安全与合规

- 强制 TLS；数据库用户最小权限；禁止公共网络直连。
- 敏感列加密（列级或应用层）；密钥托管与轮换。
- 依赖与数据库小版本定期升级，修补 CVE。

---

## 13. FAQ（针对“SQLite 开发、MySQL 上线”）

- Q: 能否一直用 SQLite 到最后再切？
  - A: 可以，但必须在预生产用 MySQL 完整跑迁移与回归，重点校验外键/唯一/索引/执行计划。
- Q: 如何避免唯一索引超长？
  - A: `utf8mb4` 下将唯一索引列限制在 191 长度，或采用前缀索引/哈希列。
- Q: JSON/Decimal/Boolean 的差异？
  - A: 使用 Prisma 对应映射，避免隐式类型转换；对 Decimal 精度严格定义。

---

## 14. 附：参数与样例

- `.env` 示例（生产）
  ```bash
  DATABASE_URL="mysql://user:pass@host:3306/appdb?connection_limit=10&socket_timeout=30"
  PRISMA_CLIENT_ENGINE_TYPE="library"
  NEXTAUTH_URL="https://your.domain"
  NEXTAUTH_SECRET="{{NEXTAUTH_SECRET}}"
  REDIS_URL="rediss://user:pass@host:6380"
  ```
- MySQL `my.cnf` 提示（按实例内存与负载调优）
  ```ini
  [mysqld]
  character-set-server=utf8mb4
  collation-server=utf8mb4_0900_ai_ci
  sql_mode=STRICT_TRANS_TABLES,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION
  time_zone=+00:00

  # InnoDB（示例值，建议为内存的 60%-70%）
  innodb_buffer_pool_size=2G
  innodb_log_file_size=512M
  innodb_flush_log_at_trx_commit=1
  innodb_file_per_table=1

  # 连接
  max_connections=400

  # binlog/备份
  server_id=1
  log_bin=/var/log/mysql/mysql-bin
  binlog_format=ROW
  binlog_expire_logs_seconds=604800

  # 慢查询
  slow_query_log=1
  slow_query_log_file=/var/log/mysql/mysql-slow.log
  long_query_time=0.2
  ```
