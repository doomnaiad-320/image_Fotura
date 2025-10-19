/**
 * 图片持久化测试脚本
 * 
 * 使用方法：
 * 1. 打开浏览器控制台 (F12)
 * 2. 复制粘贴此脚本并执行
 * 3. 查看测试结果
 */

console.log('🧪 开始测试图片持久化功能...\n');

// 测试 1: 检查数据库是否存在
async function test1_CheckDatabases() {
  console.log('📋 测试 1: 检查数据库');
  try {
    const dbs = await indexedDB.databases();
    const dbNames = dbs.map(db => db.name);
    
    console.log('  ✅ 已发现以下数据库:', dbNames);
    
    const required = [
      'aigc-studio-conversations',
      'aigc-studio-image-blobs',
      'aigc-studio-local'
    ];
    
    required.forEach(name => {
      if (dbNames.includes(name)) {
        console.log(`  ✅ ${name} - 存在`);
      } else {
        console.warn(`  ⚠️ ${name} - 缺失（可能尚未初始化）`);
      }
    });
    
    return true;
  } catch (error) {
    console.error('  ❌ 测试失败:', error);
    return false;
  }
}

// 测试 2: 查询对话数量
async function test2_CountConversations() {
  console.log('\n📋 测试 2: 查询对话数量');
  try {
    const request = indexedDB.open('aigc-studio-conversations', 1);
    
    return new Promise((resolve, reject) => {
      request.onsuccess = (e) => {
        const db = e.target.result;
        const tx = db.transaction(['conversations'], 'readonly');
        const store = tx.objectStore('conversations');
        const countReq = store.count();
        
        countReq.onsuccess = () => {
          const count = countReq.result;
          console.log(`  ✅ 对话数量: ${count}`);
          
          if (count === 0) {
            console.log('  💡 提示: 尚未创建对话，请先访问 /studio 并生成图片');
          }
          
          db.close();
          resolve(true);
        };
        
        countReq.onerror = () => {
          console.error('  ❌ 查询失败');
          db.close();
          reject(false);
        };
      };
      
      request.onerror = () => {
        console.error('  ❌ 打开数据库失败');
        reject(false);
      };
    });
  } catch (error) {
    console.error('  ❌ 测试失败:', error);
    return false;
  }
}

// 测试 3: 查询消息和图片 Blob 数量
async function test3_CountMessagesAndBlobs() {
  console.log('\n📋 测试 3: 查询消息和图片 Blob');
  try {
    // 查询消息
    const msgRequest = indexedDB.open('aigc-studio-conversations', 1);
    const msgCount = await new Promise((resolve) => {
      msgRequest.onsuccess = (e) => {
        const db = e.target.result;
        const tx = db.transaction(['messages'], 'readonly');
        const store = tx.objectStore('messages');
        const countReq = store.count();
        
        countReq.onsuccess = () => {
          db.close();
          resolve(countReq.result);
        };
      };
    });
    
    console.log(`  ✅ 消息数量: ${msgCount}`);
    
    // 查询图片 Blob
    const blobRequest = indexedDB.open('aigc-studio-image-blobs', 1);
    const blobCount = await new Promise((resolve) => {
      blobRequest.onsuccess = (e) => {
        const db = e.target.result;
        const tx = db.transaction(['imageBlobs'], 'readonly');
        const store = tx.objectStore('imageBlobs');
        const countReq = store.count();
        
        countReq.onsuccess = () => {
          db.close();
          resolve(countReq.result);
        };
      };
      
      blobRequest.onerror = () => resolve(0);
    });
    
    console.log(`  ✅ 图片 Blob 数量: ${blobCount}`);
    
    if (msgCount > 0 && blobCount === 0) {
      console.warn('  ⚠️ 警告: 有消息但无图片 Blob，可能是旧版本数据');
      console.log('  💡 建议: 清空数据库重新测试');
    }
    
    return true;
  } catch (error) {
    console.error('  ❌ 测试失败:', error);
    return false;
  }
}

// 测试 4: 检查 Blob 存储大小
async function test4_CheckBlobStorage() {
  console.log('\n📋 测试 4: 检查 Blob 存储');
  try {
    const estimate = await navigator.storage.estimate();
    const usedMB = (estimate.usage / 1024 / 1024).toFixed(2);
    const quotaMB = (estimate.quota / 1024 / 1024).toFixed(2);
    const usagePercent = ((estimate.usage / estimate.quota) * 100).toFixed(2);
    
    console.log(`  ✅ 存储使用: ${usedMB} MB / ${quotaMB} MB (${usagePercent}%)`);
    
    if (usagePercent > 80) {
      console.warn('  ⚠️ 警告: 存储空间使用超过 80%');
    } else {
      console.log('  ✅ 存储空间充足');
    }
    
    return true;
  } catch (error) {
    console.error('  ❌ 测试失败:', error);
    return false;
  }
}

// 测试 5: 显示最近的对话信息
async function test5_ShowLatestConversation() {
  console.log('\n📋 测试 5: 显示最近的对话');
  try {
    const request = indexedDB.open('aigc-studio-conversations', 1);
    
    return new Promise((resolve) => {
      request.onsuccess = (e) => {
        const db = e.target.result;
        const tx = db.transaction(['conversations', 'messages'], 'readonly');
        const convStore = tx.objectStore('conversations');
        const convIndex = convStore.index('updatedAt');
        const convReq = convIndex.openCursor(null, 'prev');
        
        convReq.onsuccess = async (event) => {
          const cursor = event.target.result;
          
          if (cursor) {
            const conv = cursor.value;
            console.log('  📝 对话信息:');
            console.log('    ID:', conv.id);
            console.log('    标题:', conv.title);
            console.log('    消息数:', conv.messageCount || 0);
            console.log('    图片数:', conv.imageCount || 0);
            console.log('    最后模型:', conv.lastActiveModel || '无');
            console.log('    创建时间:', new Date(conv.createdAt).toLocaleString());
            console.log('    更新时间:', new Date(conv.updatedAt).toLocaleString());
            
            // 查询该对话的消息
            const msgStore = tx.objectStore('messages');
            const msgIndex = msgStore.index('conversationId');
            const msgReq = msgIndex.getAll(conv.id);
            
            msgReq.onsuccess = () => {
              const messages = msgReq.result;
              console.log(`\n  💬 该对话包含 ${messages.length} 条消息:`);
              messages.forEach((msg, i) => {
                console.log(`    ${i + 1}. [${msg.role}] ${msg.content.substring(0, 30)}...`);
                if (msg.imageUrl) {
                  console.log(`       🖼️ 图片: ${msg.imageUrl.substring(0, 50)}...`);
                }
              });
              
              db.close();
              resolve(true);
            };
          } else {
            console.log('  💡 暂无对话记录');
            db.close();
            resolve(true);
          }
        };
      };
      
      request.onerror = () => {
        console.error('  ❌ 打开数据库失败');
        resolve(false);
      };
    });
  } catch (error) {
    console.error('  ❌ 测试失败:', error);
    return false;
  }
}

// 运行所有测试
async function runAllTests() {
  console.log('='.repeat(60));
  console.log('🚀 图片持久化功能测试套件');
  console.log('='.repeat(60));
  console.log('');
  
  const results = [];
  
  results.push(await test1_CheckDatabases());
  results.push(await test2_CountConversations());
  results.push(await test3_CountMessagesAndBlobs());
  results.push(await test4_CheckBlobStorage());
  results.push(await test5_ShowLatestConversation());
  
  console.log('\n' + '='.repeat(60));
  const passed = results.filter(r => r).length;
  const total = results.length;
  
  if (passed === total) {
    console.log(`✅ 所有测试通过 (${passed}/${total})`);
    console.log('💡 建议: 按照 PERSISTENCE_TEST.md 进行完整场景测试');
  } else {
    console.log(`⚠️ 部分测试失败 (${passed}/${total})`);
    console.log('💡 建议: 检查控制台错误信息，或清空数据库重新测试');
  }
  console.log('='.repeat(60));
}

// 执行测试
runAllTests();

// 导出清理函数（可选）
window.clearAllConversationData = async function() {
  console.log('🗑️ 正在清空所有对话数据...');
  
  try {
    await new Promise(resolve => {
      const req1 = indexedDB.deleteDatabase('aigc-studio-conversations');
      req1.onsuccess = resolve;
      req1.onerror = resolve;
    });
    
    await new Promise(resolve => {
      const req2 = indexedDB.deleteDatabase('aigc-studio-image-blobs');
      req2.onsuccess = resolve;
      req2.onerror = resolve;
    });
    
    console.log('✅ 数据已清空，刷新页面生效');
    console.log('💡 执行 location.reload() 刷新页面');
  } catch (error) {
    console.error('❌ 清空失败:', error);
  }
};

console.log('\n💡 提示: 执行 window.clearAllConversationData() 可清空所有数据');
