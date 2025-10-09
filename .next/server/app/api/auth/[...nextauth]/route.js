"use strict";
/*
 * ATTENTION: An "eval-source-map" devtool has been used.
 * This devtool is neither made for production nor for readable output files.
 * It uses "eval()" calls to create a separate source file with attached SourceMaps in the browser devtools.
 * If you are trying to read the output file, select a different devtool (https://webpack.js.org/configuration/devtool/)
 * or disable the default devtool with "devtool: false".
 * If you are looking for production-ready output files, see mode: "production" (https://webpack.js.org/configuration/mode/).
 */
(() => {
var exports = {};
exports.id = "app/api/auth/[...nextauth]/route";
exports.ids = ["app/api/auth/[...nextauth]/route"];
exports.modules = {

/***/ "@prisma/client":
/*!*********************************!*\
  !*** external "@prisma/client" ***!
  \*********************************/
/***/ ((module) => {

module.exports = require("@prisma/client");

/***/ }),

/***/ "../../client/components/action-async-storage.external":
/*!*******************************************************************************!*\
  !*** external "next/dist/client/components/action-async-storage.external.js" ***!
  \*******************************************************************************/
/***/ ((module) => {

module.exports = require("next/dist/client/components/action-async-storage.external.js");

/***/ }),

/***/ "../../client/components/request-async-storage.external":
/*!********************************************************************************!*\
  !*** external "next/dist/client/components/request-async-storage.external.js" ***!
  \********************************************************************************/
/***/ ((module) => {

module.exports = require("next/dist/client/components/request-async-storage.external.js");

/***/ }),

/***/ "../../client/components/static-generation-async-storage.external":
/*!******************************************************************************************!*\
  !*** external "next/dist/client/components/static-generation-async-storage.external.js" ***!
  \******************************************************************************************/
/***/ ((module) => {

module.exports = require("next/dist/client/components/static-generation-async-storage.external.js");

/***/ }),

/***/ "next/dist/compiled/next-server/app-page.runtime.dev.js":
/*!*************************************************************************!*\
  !*** external "next/dist/compiled/next-server/app-page.runtime.dev.js" ***!
  \*************************************************************************/
/***/ ((module) => {

module.exports = require("next/dist/compiled/next-server/app-page.runtime.dev.js");

/***/ }),

/***/ "next/dist/compiled/next-server/app-route.runtime.dev.js":
/*!**************************************************************************!*\
  !*** external "next/dist/compiled/next-server/app-route.runtime.dev.js" ***!
  \**************************************************************************/
/***/ ((module) => {

module.exports = require("next/dist/compiled/next-server/app-route.runtime.dev.js");

/***/ }),

/***/ "assert":
/*!*************************!*\
  !*** external "assert" ***!
  \*************************/
/***/ ((module) => {

module.exports = require("assert");

/***/ }),

/***/ "buffer":
/*!*************************!*\
  !*** external "buffer" ***!
  \*************************/
/***/ ((module) => {

module.exports = require("buffer");

/***/ }),

/***/ "crypto":
/*!*************************!*\
  !*** external "crypto" ***!
  \*************************/
/***/ ((module) => {

module.exports = require("crypto");

/***/ }),

/***/ "events":
/*!*************************!*\
  !*** external "events" ***!
  \*************************/
/***/ ((module) => {

module.exports = require("events");

/***/ }),

/***/ "http":
/*!***********************!*\
  !*** external "http" ***!
  \***********************/
/***/ ((module) => {

module.exports = require("http");

/***/ }),

/***/ "https":
/*!************************!*\
  !*** external "https" ***!
  \************************/
/***/ ((module) => {

module.exports = require("https");

/***/ }),

/***/ "querystring":
/*!******************************!*\
  !*** external "querystring" ***!
  \******************************/
/***/ ((module) => {

module.exports = require("querystring");

/***/ }),

/***/ "url":
/*!**********************!*\
  !*** external "url" ***!
  \**********************/
/***/ ((module) => {

module.exports = require("url");

/***/ }),

/***/ "util":
/*!***********************!*\
  !*** external "util" ***!
  \***********************/
/***/ ((module) => {

module.exports = require("util");

/***/ }),

/***/ "zlib":
/*!***********************!*\
  !*** external "zlib" ***!
  \***********************/
/***/ ((module) => {

module.exports = require("zlib");

/***/ }),

/***/ "(rsc)/./node_modules/next/dist/build/webpack/loaders/next-app-loader.js?name=app%2Fapi%2Fauth%2F%5B...nextauth%5D%2Froute&page=%2Fapi%2Fauth%2F%5B...nextauth%5D%2Froute&appPaths=&pagePath=private-next-app-dir%2Fapi%2Fauth%2F%5B...nextauth%5D%2Froute.ts&appDir=%2FUsers%2Fdoomnaiad%2FDocuments%2FCode%2Fimage-fotura%2Fapp&pageExtensions=tsx&pageExtensions=ts&pageExtensions=jsx&pageExtensions=js&rootDir=%2FUsers%2Fdoomnaiad%2FDocuments%2FCode%2Fimage-fotura&isDev=true&tsconfigPath=tsconfig.json&basePath=&assetPrefix=&nextConfigOutput=&preferredRegion=&middlewareConfig=e30%3D!":
/*!****************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************!*\
  !*** ./node_modules/next/dist/build/webpack/loaders/next-app-loader.js?name=app%2Fapi%2Fauth%2F%5B...nextauth%5D%2Froute&page=%2Fapi%2Fauth%2F%5B...nextauth%5D%2Froute&appPaths=&pagePath=private-next-app-dir%2Fapi%2Fauth%2F%5B...nextauth%5D%2Froute.ts&appDir=%2FUsers%2Fdoomnaiad%2FDocuments%2FCode%2Fimage-fotura%2Fapp&pageExtensions=tsx&pageExtensions=ts&pageExtensions=jsx&pageExtensions=js&rootDir=%2FUsers%2Fdoomnaiad%2FDocuments%2FCode%2Fimage-fotura&isDev=true&tsconfigPath=tsconfig.json&basePath=&assetPrefix=&nextConfigOutput=&preferredRegion=&middlewareConfig=e30%3D! ***!
  \****************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

eval("__webpack_require__.r(__webpack_exports__);\n/* harmony export */ __webpack_require__.d(__webpack_exports__, {\n/* harmony export */   originalPathname: () => (/* binding */ originalPathname),\n/* harmony export */   patchFetch: () => (/* binding */ patchFetch),\n/* harmony export */   requestAsyncStorage: () => (/* binding */ requestAsyncStorage),\n/* harmony export */   routeModule: () => (/* binding */ routeModule),\n/* harmony export */   serverHooks: () => (/* binding */ serverHooks),\n/* harmony export */   staticGenerationAsyncStorage: () => (/* binding */ staticGenerationAsyncStorage)\n/* harmony export */ });\n/* harmony import */ var next_dist_server_future_route_modules_app_route_module_compiled__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! next/dist/server/future/route-modules/app-route/module.compiled */ \"(rsc)/./node_modules/next/dist/server/future/route-modules/app-route/module.compiled.js\");\n/* harmony import */ var next_dist_server_future_route_modules_app_route_module_compiled__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(next_dist_server_future_route_modules_app_route_module_compiled__WEBPACK_IMPORTED_MODULE_0__);\n/* harmony import */ var next_dist_server_future_route_kind__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! next/dist/server/future/route-kind */ \"(rsc)/./node_modules/next/dist/server/future/route-kind.js\");\n/* harmony import */ var next_dist_server_lib_patch_fetch__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! next/dist/server/lib/patch-fetch */ \"(rsc)/./node_modules/next/dist/server/lib/patch-fetch.js\");\n/* harmony import */ var next_dist_server_lib_patch_fetch__WEBPACK_IMPORTED_MODULE_2___default = /*#__PURE__*/__webpack_require__.n(next_dist_server_lib_patch_fetch__WEBPACK_IMPORTED_MODULE_2__);\n/* harmony import */ var _Users_doomnaiad_Documents_Code_image_fotura_app_api_auth_nextauth_route_ts__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ./app/api/auth/[...nextauth]/route.ts */ \"(rsc)/./app/api/auth/[...nextauth]/route.ts\");\n\n\n\n\n// We inject the nextConfigOutput here so that we can use them in the route\n// module.\nconst nextConfigOutput = \"\"\nconst routeModule = new next_dist_server_future_route_modules_app_route_module_compiled__WEBPACK_IMPORTED_MODULE_0__.AppRouteRouteModule({\n    definition: {\n        kind: next_dist_server_future_route_kind__WEBPACK_IMPORTED_MODULE_1__.RouteKind.APP_ROUTE,\n        page: \"/api/auth/[...nextauth]/route\",\n        pathname: \"/api/auth/[...nextauth]\",\n        filename: \"route\",\n        bundlePath: \"app/api/auth/[...nextauth]/route\"\n    },\n    resolvedPagePath: \"/Users/doomnaiad/Documents/Code/image-fotura/app/api/auth/[...nextauth]/route.ts\",\n    nextConfigOutput,\n    userland: _Users_doomnaiad_Documents_Code_image_fotura_app_api_auth_nextauth_route_ts__WEBPACK_IMPORTED_MODULE_3__\n});\n// Pull out the exports that we need to expose from the module. This should\n// be eliminated when we've moved the other routes to the new format. These\n// are used to hook into the route.\nconst { requestAsyncStorage, staticGenerationAsyncStorage, serverHooks } = routeModule;\nconst originalPathname = \"/api/auth/[...nextauth]/route\";\nfunction patchFetch() {\n    return (0,next_dist_server_lib_patch_fetch__WEBPACK_IMPORTED_MODULE_2__.patchFetch)({\n        serverHooks,\n        staticGenerationAsyncStorage\n    });\n}\n\n\n//# sourceMappingURL=app-route.js.map//# sourceURL=[module]\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiKHJzYykvLi9ub2RlX21vZHVsZXMvbmV4dC9kaXN0L2J1aWxkL3dlYnBhY2svbG9hZGVycy9uZXh0LWFwcC1sb2FkZXIuanM/bmFtZT1hcHAlMkZhcGklMkZhdXRoJTJGJTVCLi4ubmV4dGF1dGglNUQlMkZyb3V0ZSZwYWdlPSUyRmFwaSUyRmF1dGglMkYlNUIuLi5uZXh0YXV0aCU1RCUyRnJvdXRlJmFwcFBhdGhzPSZwYWdlUGF0aD1wcml2YXRlLW5leHQtYXBwLWRpciUyRmFwaSUyRmF1dGglMkYlNUIuLi5uZXh0YXV0aCU1RCUyRnJvdXRlLnRzJmFwcERpcj0lMkZVc2VycyUyRmRvb21uYWlhZCUyRkRvY3VtZW50cyUyRkNvZGUlMkZpbWFnZS1mb3R1cmElMkZhcHAmcGFnZUV4dGVuc2lvbnM9dHN4JnBhZ2VFeHRlbnNpb25zPXRzJnBhZ2VFeHRlbnNpb25zPWpzeCZwYWdlRXh0ZW5zaW9ucz1qcyZyb290RGlyPSUyRlVzZXJzJTJGZG9vbW5haWFkJTJGRG9jdW1lbnRzJTJGQ29kZSUyRmltYWdlLWZvdHVyYSZpc0Rldj10cnVlJnRzY29uZmlnUGF0aD10c2NvbmZpZy5qc29uJmJhc2VQYXRoPSZhc3NldFByZWZpeD0mbmV4dENvbmZpZ091dHB1dD0mcHJlZmVycmVkUmVnaW9uPSZtaWRkbGV3YXJlQ29uZmlnPWUzMCUzRCEiLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7O0FBQXNHO0FBQ3ZDO0FBQ2M7QUFDZ0M7QUFDN0c7QUFDQTtBQUNBO0FBQ0Esd0JBQXdCLGdIQUFtQjtBQUMzQztBQUNBLGNBQWMseUVBQVM7QUFDdkI7QUFDQTtBQUNBO0FBQ0E7QUFDQSxLQUFLO0FBQ0w7QUFDQTtBQUNBLFlBQVk7QUFDWixDQUFDO0FBQ0Q7QUFDQTtBQUNBO0FBQ0EsUUFBUSxpRUFBaUU7QUFDekU7QUFDQTtBQUNBLFdBQVcsNEVBQVc7QUFDdEI7QUFDQTtBQUNBLEtBQUs7QUFDTDtBQUN1SDs7QUFFdkgiLCJzb3VyY2VzIjpbIndlYnBhY2s6Ly9haWdjLXN0dWRpby8/NzkwYyJdLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBBcHBSb3V0ZVJvdXRlTW9kdWxlIH0gZnJvbSBcIm5leHQvZGlzdC9zZXJ2ZXIvZnV0dXJlL3JvdXRlLW1vZHVsZXMvYXBwLXJvdXRlL21vZHVsZS5jb21waWxlZFwiO1xuaW1wb3J0IHsgUm91dGVLaW5kIH0gZnJvbSBcIm5leHQvZGlzdC9zZXJ2ZXIvZnV0dXJlL3JvdXRlLWtpbmRcIjtcbmltcG9ydCB7IHBhdGNoRmV0Y2ggYXMgX3BhdGNoRmV0Y2ggfSBmcm9tIFwibmV4dC9kaXN0L3NlcnZlci9saWIvcGF0Y2gtZmV0Y2hcIjtcbmltcG9ydCAqIGFzIHVzZXJsYW5kIGZyb20gXCIvVXNlcnMvZG9vbW5haWFkL0RvY3VtZW50cy9Db2RlL2ltYWdlLWZvdHVyYS9hcHAvYXBpL2F1dGgvWy4uLm5leHRhdXRoXS9yb3V0ZS50c1wiO1xuLy8gV2UgaW5qZWN0IHRoZSBuZXh0Q29uZmlnT3V0cHV0IGhlcmUgc28gdGhhdCB3ZSBjYW4gdXNlIHRoZW0gaW4gdGhlIHJvdXRlXG4vLyBtb2R1bGUuXG5jb25zdCBuZXh0Q29uZmlnT3V0cHV0ID0gXCJcIlxuY29uc3Qgcm91dGVNb2R1bGUgPSBuZXcgQXBwUm91dGVSb3V0ZU1vZHVsZSh7XG4gICAgZGVmaW5pdGlvbjoge1xuICAgICAgICBraW5kOiBSb3V0ZUtpbmQuQVBQX1JPVVRFLFxuICAgICAgICBwYWdlOiBcIi9hcGkvYXV0aC9bLi4ubmV4dGF1dGhdL3JvdXRlXCIsXG4gICAgICAgIHBhdGhuYW1lOiBcIi9hcGkvYXV0aC9bLi4ubmV4dGF1dGhdXCIsXG4gICAgICAgIGZpbGVuYW1lOiBcInJvdXRlXCIsXG4gICAgICAgIGJ1bmRsZVBhdGg6IFwiYXBwL2FwaS9hdXRoL1suLi5uZXh0YXV0aF0vcm91dGVcIlxuICAgIH0sXG4gICAgcmVzb2x2ZWRQYWdlUGF0aDogXCIvVXNlcnMvZG9vbW5haWFkL0RvY3VtZW50cy9Db2RlL2ltYWdlLWZvdHVyYS9hcHAvYXBpL2F1dGgvWy4uLm5leHRhdXRoXS9yb3V0ZS50c1wiLFxuICAgIG5leHRDb25maWdPdXRwdXQsXG4gICAgdXNlcmxhbmRcbn0pO1xuLy8gUHVsbCBvdXQgdGhlIGV4cG9ydHMgdGhhdCB3ZSBuZWVkIHRvIGV4cG9zZSBmcm9tIHRoZSBtb2R1bGUuIFRoaXMgc2hvdWxkXG4vLyBiZSBlbGltaW5hdGVkIHdoZW4gd2UndmUgbW92ZWQgdGhlIG90aGVyIHJvdXRlcyB0byB0aGUgbmV3IGZvcm1hdC4gVGhlc2Vcbi8vIGFyZSB1c2VkIHRvIGhvb2sgaW50byB0aGUgcm91dGUuXG5jb25zdCB7IHJlcXVlc3RBc3luY1N0b3JhZ2UsIHN0YXRpY0dlbmVyYXRpb25Bc3luY1N0b3JhZ2UsIHNlcnZlckhvb2tzIH0gPSByb3V0ZU1vZHVsZTtcbmNvbnN0IG9yaWdpbmFsUGF0aG5hbWUgPSBcIi9hcGkvYXV0aC9bLi4ubmV4dGF1dGhdL3JvdXRlXCI7XG5mdW5jdGlvbiBwYXRjaEZldGNoKCkge1xuICAgIHJldHVybiBfcGF0Y2hGZXRjaCh7XG4gICAgICAgIHNlcnZlckhvb2tzLFxuICAgICAgICBzdGF0aWNHZW5lcmF0aW9uQXN5bmNTdG9yYWdlXG4gICAgfSk7XG59XG5leHBvcnQgeyByb3V0ZU1vZHVsZSwgcmVxdWVzdEFzeW5jU3RvcmFnZSwgc3RhdGljR2VuZXJhdGlvbkFzeW5jU3RvcmFnZSwgc2VydmVySG9va3MsIG9yaWdpbmFsUGF0aG5hbWUsIHBhdGNoRmV0Y2gsICB9O1xuXG4vLyMgc291cmNlTWFwcGluZ1VSTD1hcHAtcm91dGUuanMubWFwIl0sIm5hbWVzIjpbXSwic291cmNlUm9vdCI6IiJ9\n//# sourceURL=webpack-internal:///(rsc)/./node_modules/next/dist/build/webpack/loaders/next-app-loader.js?name=app%2Fapi%2Fauth%2F%5B...nextauth%5D%2Froute&page=%2Fapi%2Fauth%2F%5B...nextauth%5D%2Froute&appPaths=&pagePath=private-next-app-dir%2Fapi%2Fauth%2F%5B...nextauth%5D%2Froute.ts&appDir=%2FUsers%2Fdoomnaiad%2FDocuments%2FCode%2Fimage-fotura%2Fapp&pageExtensions=tsx&pageExtensions=ts&pageExtensions=jsx&pageExtensions=js&rootDir=%2FUsers%2Fdoomnaiad%2FDocuments%2FCode%2Fimage-fotura&isDev=true&tsconfigPath=tsconfig.json&basePath=&assetPrefix=&nextConfigOutput=&preferredRegion=&middlewareConfig=e30%3D!\n");

/***/ }),

/***/ "(rsc)/./app/api/auth/[...nextauth]/route.ts":
/*!*********************************************!*\
  !*** ./app/api/auth/[...nextauth]/route.ts ***!
  \*********************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

eval("__webpack_require__.r(__webpack_exports__);\n/* harmony export */ __webpack_require__.d(__webpack_exports__, {\n/* harmony export */   GET: () => (/* binding */ handler),\n/* harmony export */   POST: () => (/* binding */ handler)\n/* harmony export */ });\n/* harmony import */ var next_auth__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! next-auth */ \"(rsc)/./node_modules/next-auth/index.js\");\n/* harmony import */ var next_auth__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(next_auth__WEBPACK_IMPORTED_MODULE_0__);\n/* harmony import */ var _lib_auth__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! @/lib/auth */ \"(rsc)/./lib/auth.ts\");\n\n\nconst handler = next_auth__WEBPACK_IMPORTED_MODULE_0___default()(_lib_auth__WEBPACK_IMPORTED_MODULE_1__.authOptions);\n\n//# sourceURL=[module]\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiKHJzYykvLi9hcHAvYXBpL2F1dGgvWy4uLm5leHRhdXRoXS9yb3V0ZS50cyIsIm1hcHBpbmdzIjoiOzs7Ozs7OztBQUFpQztBQUVRO0FBRXpDLE1BQU1FLFVBQVVGLGdEQUFRQSxDQUFDQyxrREFBV0E7QUFFTyIsInNvdXJjZXMiOlsid2VicGFjazovL2FpZ2Mtc3R1ZGlvLy4vYXBwL2FwaS9hdXRoL1suLi5uZXh0YXV0aF0vcm91dGUudHM/YzhhNCJdLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgTmV4dEF1dGggZnJvbSBcIm5leHQtYXV0aFwiO1xuXG5pbXBvcnQgeyBhdXRoT3B0aW9ucyB9IGZyb20gXCJAL2xpYi9hdXRoXCI7XG5cbmNvbnN0IGhhbmRsZXIgPSBOZXh0QXV0aChhdXRoT3B0aW9ucyk7XG5cbmV4cG9ydCB7IGhhbmRsZXIgYXMgR0VULCBoYW5kbGVyIGFzIFBPU1QgfTtcbiJdLCJuYW1lcyI6WyJOZXh0QXV0aCIsImF1dGhPcHRpb25zIiwiaGFuZGxlciIsIkdFVCIsIlBPU1QiXSwic291cmNlUm9vdCI6IiJ9\n//# sourceURL=webpack-internal:///(rsc)/./app/api/auth/[...nextauth]/route.ts\n");

/***/ }),

/***/ "(rsc)/./lib/auth.ts":
/*!*********************!*\
  !*** ./lib/auth.ts ***!
  \*********************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

eval("__webpack_require__.r(__webpack_exports__);\n/* harmony export */ __webpack_require__.d(__webpack_exports__, {\n/* harmony export */   authOptions: () => (/* binding */ authOptions),\n/* harmony export */   getCurrentSession: () => (/* binding */ getCurrentSession),\n/* harmony export */   getCurrentUser: () => (/* binding */ getCurrentUser),\n/* harmony export */   registerUser: () => (/* binding */ registerUser)\n/* harmony export */ });\n/* harmony import */ var _next_auth_prisma_adapter__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! @next-auth/prisma-adapter */ \"(rsc)/./node_modules/@next-auth/prisma-adapter/dist/index.js\");\n/* harmony import */ var next_auth__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! next-auth */ \"(rsc)/./node_modules/next-auth/index.js\");\n/* harmony import */ var next_auth__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(next_auth__WEBPACK_IMPORTED_MODULE_1__);\n/* harmony import */ var next_auth_providers_credentials__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! next-auth/providers/credentials */ \"(rsc)/./node_modules/next-auth/providers/credentials.js\");\n/* harmony import */ var bcryptjs__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! bcryptjs */ \"(rsc)/./node_modules/bcryptjs/index.js\");\n/* harmony import */ var bcryptjs__WEBPACK_IMPORTED_MODULE_3___default = /*#__PURE__*/__webpack_require__.n(bcryptjs__WEBPACK_IMPORTED_MODULE_3__);\n/* harmony import */ var zod__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(/*! zod */ \"(rsc)/./node_modules/zod/v3/types.js\");\n/* harmony import */ var _lib_prisma__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! @/lib/prisma */ \"(rsc)/./lib/prisma.ts\");\n\n\n\n\n\n\nconst credentialsSchema = zod__WEBPACK_IMPORTED_MODULE_5__.object({\n    email: zod__WEBPACK_IMPORTED_MODULE_5__.string().email({\n        message: \"邮箱格式不正确\"\n    }),\n    password: zod__WEBPACK_IMPORTED_MODULE_5__.string().min(8, {\n        message: \"密码至少 8 位\"\n    })\n});\nconst authOptions = {\n    adapter: (0,_next_auth_prisma_adapter__WEBPACK_IMPORTED_MODULE_0__.PrismaAdapter)(_lib_prisma__WEBPACK_IMPORTED_MODULE_4__.prisma),\n    session: {\n        strategy: \"jwt\",\n        maxAge: 30 * 24 * 60 * 60\n    },\n    pages: {\n        signIn: \"/auth/signin\",\n        signOut: \"/auth/signin\"\n    },\n    providers: [\n        (0,next_auth_providers_credentials__WEBPACK_IMPORTED_MODULE_2__[\"default\"])({\n            name: \"邮箱密码登录\",\n            credentials: {\n                email: {\n                    label: \"邮箱\",\n                    type: \"email\"\n                },\n                password: {\n                    label: \"密码\",\n                    type: \"password\"\n                }\n            },\n            async authorize (credentials) {\n                const parsed = credentialsSchema.safeParse(credentials);\n                if (!parsed.success) {\n                    return null;\n                }\n                const { email, password } = parsed.data;\n                const user = await _lib_prisma__WEBPACK_IMPORTED_MODULE_4__.prisma.user.findUnique({\n                    where: {\n                        email\n                    }\n                });\n                if (!user || !user.passwordHash) {\n                    return null;\n                }\n                const passwordMatches = await bcryptjs__WEBPACK_IMPORTED_MODULE_3___default().compare(password, user.passwordHash);\n                if (!passwordMatches) {\n                    return null;\n                }\n                return {\n                    id: user.id,\n                    email: user.email,\n                    name: user.name ?? undefined,\n                    role: user.role,\n                    credits: user.credits\n                };\n            }\n        })\n    ],\n    callbacks: {\n        async session ({ session, token }) {\n            if (session.user && token) {\n                session.user.id = token.id;\n                session.user.role = token.role;\n                session.user.credits = Number(token.credits ?? 0);\n            }\n            return session;\n        },\n        async jwt ({ token, user }) {\n            if (user) {\n                token.id = user.id;\n                token.role = user.role;\n                token.credits = user.credits;\n                token.name = user.name;\n                token.email = user.email;\n            }\n            if (!user && token?.id) {\n                const dbUser = await _lib_prisma__WEBPACK_IMPORTED_MODULE_4__.prisma.user.findUnique({\n                    where: {\n                        id: token.id\n                    },\n                    select: {\n                        id: true,\n                        email: true,\n                        name: true,\n                        role: true,\n                        credits: true\n                    }\n                });\n                if (dbUser) {\n                    token.id = dbUser.id;\n                    token.role = dbUser.role;\n                    token.credits = dbUser.credits;\n                    token.email = dbUser.email;\n                    token.name = dbUser.name ?? undefined;\n                }\n            }\n            return token;\n        }\n    }\n};\nasync function getCurrentSession() {\n    return (0,next_auth__WEBPACK_IMPORTED_MODULE_1__.getServerSession)(authOptions);\n}\nasync function getCurrentUser() {\n    const session = await getCurrentSession();\n    const sessionUser = session?.user;\n    if (!sessionUser?.id) {\n        return null;\n    }\n    const user = await _lib_prisma__WEBPACK_IMPORTED_MODULE_4__.prisma.user.findUnique({\n        where: {\n            id: sessionUser.id\n        },\n        select: {\n            id: true,\n            email: true,\n            name: true,\n            role: true,\n            credits: true\n        }\n    });\n    return user ?? null;\n}\nasync function registerUser({ email, name, password }) {\n    const existing = await _lib_prisma__WEBPACK_IMPORTED_MODULE_4__.prisma.user.findUnique({\n        where: {\n            email\n        }\n    });\n    if (existing) {\n        throw new Error(\"邮箱已注册\");\n    }\n    const passwordHash = await bcryptjs__WEBPACK_IMPORTED_MODULE_3___default().hash(password, 10);\n    const isFirstUser = await _lib_prisma__WEBPACK_IMPORTED_MODULE_4__.prisma.user.count() === 0;\n    return _lib_prisma__WEBPACK_IMPORTED_MODULE_4__.prisma.user.create({\n        data: {\n            email,\n            name,\n            passwordHash,\n            role: isFirstUser ? \"admin\" : \"user\",\n            credits: isFirstUser ? 100000 : 5000\n        }\n    });\n}\n//# sourceURL=[module]\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,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Q1EsVUFBVTtJQUVqRCxNQUFNMkMsY0FBYyxNQUFPakQsK0NBQU1BLENBQUMwQixJQUFJLENBQUN3QixLQUFLLE9BQVE7SUFFcEQsT0FBT2xELCtDQUFNQSxDQUFDMEIsSUFBSSxDQUFDeUIsTUFBTSxDQUFDO1FBQ3hCMUIsTUFBTTtZQUNKdEI7WUFDQWM7WUFDQVk7WUFDQUssTUFBTWUsY0FBYyxVQUFVO1lBQzlCZCxTQUFTYyxjQUFjLFNBQVU7UUFDbkM7SUFDRjtBQUNGIiwic291cmNlcyI6WyJ3ZWJwYWNrOi8vYWlnYy1zdHVkaW8vLi9saWIvYXV0aC50cz9iZjdlIl0sInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IFByaXNtYUFkYXB0ZXIgfSBmcm9tIFwiQG5leHQtYXV0aC9wcmlzbWEtYWRhcHRlclwiO1xuaW1wb3J0IHR5cGUgeyBOZXh0QXV0aE9wdGlvbnMgfSBmcm9tIFwibmV4dC1hdXRoXCI7XG5pbXBvcnQgeyBnZXRTZXJ2ZXJTZXNzaW9uIH0gZnJvbSBcIm5leHQtYXV0aFwiO1xuaW1wb3J0IENyZWRlbnRpYWxzUHJvdmlkZXIgZnJvbSBcIm5leHQtYXV0aC9wcm92aWRlcnMvY3JlZGVudGlhbHNcIjtcbmltcG9ydCBiY3J5cHQgZnJvbSBcImJjcnlwdGpzXCI7XG5pbXBvcnQgeyB6IH0gZnJvbSBcInpvZFwiO1xuXG5pbXBvcnQgeyBwcmlzbWEgfSBmcm9tIFwiQC9saWIvcHJpc21hXCI7XG5cbmNvbnN0IGNyZWRlbnRpYWxzU2NoZW1hID0gei5vYmplY3Qoe1xuICBlbWFpbDogei5zdHJpbmcoKS5lbWFpbCh7IG1lc3NhZ2U6IFwi6YKu566x5qC85byP5LiN5q2j56GuXCIgfSksXG4gIHBhc3N3b3JkOiB6LnN0cmluZygpLm1pbig4LCB7IG1lc3NhZ2U6IFwi5a+G56CB6Iez5bCRIDgg5L2NXCIgfSlcbn0pO1xuXG5leHBvcnQgY29uc3QgYXV0aE9wdGlvbnM6IE5leHRBdXRoT3B0aW9ucyA9IHtcbiAgYWRhcHRlcjogUHJpc21hQWRhcHRlcihwcmlzbWEpLFxuICBzZXNzaW9uOiB7XG4gICAgc3RyYXRlZ3k6IFwiand0XCIsXG4gICAgbWF4QWdlOiAzMCAqIDI0ICogNjAgKiA2MFxuICB9LFxuICBwYWdlczoge1xuICAgIHNpZ25JbjogXCIvYXV0aC9zaWduaW5cIixcbiAgICBzaWduT3V0OiBcIi9hdXRoL3NpZ25pblwiXG4gIH0sXG4gIHByb3ZpZGVyczogW1xuICAgIENyZWRlbnRpYWxzUHJvdmlkZXIoe1xuICAgICAgbmFtZTogXCLpgq7nrrHlr4bnoIHnmbvlvZVcIixcbiAgICAgIGNyZWRlbnRpYWxzOiB7XG4gICAgICAgIGVtYWlsOiB7IGxhYmVsOiBcIumCrueusVwiLCB0eXBlOiBcImVtYWlsXCIgfSxcbiAgICAgICAgcGFzc3dvcmQ6IHsgbGFiZWw6IFwi5a+G56CBXCIsIHR5cGU6IFwicGFzc3dvcmRcIiB9XG4gICAgICB9LFxuICAgICAgYXN5bmMgYXV0aG9yaXplKGNyZWRlbnRpYWxzKSB7XG4gICAgICAgIGNvbnN0IHBhcnNlZCA9IGNyZWRlbnRpYWxzU2NoZW1hLnNhZmVQYXJzZShjcmVkZW50aWFscyk7XG4gICAgICAgIGlmICghcGFyc2VkLnN1Y2Nlc3MpIHtcbiAgICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN0IHsgZW1haWwsIHBhc3N3b3JkIH0gPSBwYXJzZWQuZGF0YTtcblxuICAgICAgICBjb25zdCB1c2VyID0gYXdhaXQgcHJpc21hLnVzZXIuZmluZFVuaXF1ZSh7XG4gICAgICAgICAgd2hlcmU6IHsgZW1haWwgfVxuICAgICAgICB9KTtcblxuICAgICAgICBpZiAoIXVzZXIgfHwgIXVzZXIucGFzc3dvcmRIYXNoKSB7XG4gICAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICAgIH1cblxuICAgICAgICBjb25zdCBwYXNzd29yZE1hdGNoZXMgPSBhd2FpdCBiY3J5cHQuY29tcGFyZShwYXNzd29yZCwgdXNlci5wYXNzd29yZEhhc2gpO1xuXG4gICAgICAgIGlmICghcGFzc3dvcmRNYXRjaGVzKSB7XG4gICAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgIGlkOiB1c2VyLmlkLFxuICAgICAgICAgIGVtYWlsOiB1c2VyLmVtYWlsLFxuICAgICAgICAgIG5hbWU6IHVzZXIubmFtZSA/PyB1bmRlZmluZWQsXG4gICAgICAgICAgcm9sZTogdXNlci5yb2xlLFxuICAgICAgICAgIGNyZWRpdHM6IHVzZXIuY3JlZGl0c1xuICAgICAgICB9IGFzIGFueTtcbiAgICAgIH1cbiAgICB9KVxuICBdLFxuICBjYWxsYmFja3M6IHtcbiAgICBhc3luYyBzZXNzaW9uKHsgc2Vzc2lvbiwgdG9rZW4gfSkge1xuICAgICAgaWYgKHNlc3Npb24udXNlciAmJiB0b2tlbikge1xuICAgICAgICBzZXNzaW9uLnVzZXIuaWQgPSB0b2tlbi5pZCBhcyBzdHJpbmc7XG4gICAgICAgIHNlc3Npb24udXNlci5yb2xlID0gdG9rZW4ucm9sZSBhcyBzdHJpbmc7XG4gICAgICAgIHNlc3Npb24udXNlci5jcmVkaXRzID0gTnVtYmVyKHRva2VuLmNyZWRpdHMgPz8gMCk7XG4gICAgICB9XG4gICAgICByZXR1cm4gc2Vzc2lvbjtcbiAgICB9LFxuICAgIGFzeW5jIGp3dCh7IHRva2VuLCB1c2VyIH0pIHtcbiAgICAgIGlmICh1c2VyKSB7XG4gICAgICAgIHRva2VuLmlkID0gdXNlci5pZDtcbiAgICAgICAgdG9rZW4ucm9sZSA9ICh1c2VyIGFzIGFueSkucm9sZTtcbiAgICAgICAgdG9rZW4uY3JlZGl0cyA9ICh1c2VyIGFzIGFueSkuY3JlZGl0cztcbiAgICAgICAgdG9rZW4ubmFtZSA9IHVzZXIubmFtZTtcbiAgICAgICAgdG9rZW4uZW1haWwgPSB1c2VyLmVtYWlsO1xuICAgICAgfVxuXG4gICAgICBpZiAoIXVzZXIgJiYgdG9rZW4/LmlkKSB7XG4gICAgICAgIGNvbnN0IGRiVXNlciA9IGF3YWl0IHByaXNtYS51c2VyLmZpbmRVbmlxdWUoe1xuICAgICAgICAgIHdoZXJlOiB7IGlkOiB0b2tlbi5pZCBhcyBzdHJpbmcgfSxcbiAgICAgICAgICBzZWxlY3Q6IHtcbiAgICAgICAgICAgIGlkOiB0cnVlLFxuICAgICAgICAgICAgZW1haWw6IHRydWUsXG4gICAgICAgICAgICBuYW1lOiB0cnVlLFxuICAgICAgICAgICAgcm9sZTogdHJ1ZSxcbiAgICAgICAgICAgIGNyZWRpdHM6IHRydWVcbiAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgICBpZiAoZGJVc2VyKSB7XG4gICAgICAgICAgdG9rZW4uaWQgPSBkYlVzZXIuaWQ7XG4gICAgICAgICAgdG9rZW4ucm9sZSA9IGRiVXNlci5yb2xlO1xuICAgICAgICAgIHRva2VuLmNyZWRpdHMgPSBkYlVzZXIuY3JlZGl0cztcbiAgICAgICAgICB0b2tlbi5lbWFpbCA9IGRiVXNlci5lbWFpbDtcbiAgICAgICAgICB0b2tlbi5uYW1lID0gZGJVc2VyLm5hbWUgPz8gdW5kZWZpbmVkO1xuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIHJldHVybiB0b2tlbjtcbiAgICB9XG4gIH1cbn07XG5cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBnZXRDdXJyZW50U2Vzc2lvbigpIHtcbiAgcmV0dXJuIGdldFNlcnZlclNlc3Npb24oYXV0aE9wdGlvbnMpO1xufVxuXG5leHBvcnQgdHlwZSBDdXJyZW50VXNlciA9IHtcbiAgaWQ6IHN0cmluZztcbiAgZW1haWw6IHN0cmluZztcbiAgbmFtZTogc3RyaW5nIHwgbnVsbDtcbiAgcm9sZTogc3RyaW5nO1xuICBjcmVkaXRzOiBudW1iZXI7XG59O1xuXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gZ2V0Q3VycmVudFVzZXIoKTogUHJvbWlzZTxDdXJyZW50VXNlciB8IG51bGw+IHtcbiAgY29uc3Qgc2Vzc2lvbiA9IGF3YWl0IGdldEN1cnJlbnRTZXNzaW9uKCk7XG4gIGNvbnN0IHNlc3Npb25Vc2VyID0gc2Vzc2lvbj8udXNlciBhc1xuICAgIHwgKEN1cnJlbnRVc2VyICYgeyBpZDogc3RyaW5nIH0pXG4gICAgfCB1bmRlZmluZWQ7XG5cbiAgaWYgKCFzZXNzaW9uVXNlcj8uaWQpIHtcbiAgICByZXR1cm4gbnVsbDtcbiAgfVxuXG4gIGNvbnN0IHVzZXIgPSBhd2FpdCBwcmlzbWEudXNlci5maW5kVW5pcXVlKHtcbiAgICB3aGVyZTogeyBpZDogc2Vzc2lvblVzZXIuaWQgfSxcbiAgICBzZWxlY3Q6IHtcbiAgICAgIGlkOiB0cnVlLFxuICAgICAgZW1haWw6IHRydWUsXG4gICAgICBuYW1lOiB0cnVlLFxuICAgICAgcm9sZTogdHJ1ZSxcbiAgICAgIGNyZWRpdHM6IHRydWVcbiAgICB9XG4gIH0pO1xuXG4gIHJldHVybiB1c2VyID8/IG51bGw7XG59XG5cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiByZWdpc3RlclVzZXIoe1xuICBlbWFpbCxcbiAgbmFtZSxcbiAgcGFzc3dvcmRcbn06IHtcbiAgZW1haWw6IHN0cmluZztcbiAgbmFtZTogc3RyaW5nO1xuICBwYXNzd29yZDogc3RyaW5nO1xufSkge1xuICBjb25zdCBleGlzdGluZyA9IGF3YWl0IHByaXNtYS51c2VyLmZpbmRVbmlxdWUoeyB3aGVyZTogeyBlbWFpbCB9IH0pO1xuICBpZiAoZXhpc3RpbmcpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoXCLpgq7nrrHlt7Lms6jlhoxcIik7XG4gIH1cblxuICBjb25zdCBwYXNzd29yZEhhc2ggPSBhd2FpdCBiY3J5cHQuaGFzaChwYXNzd29yZCwgMTApO1xuXG4gIGNvbnN0IGlzRmlyc3RVc2VyID0gKGF3YWl0IHByaXNtYS51c2VyLmNvdW50KCkpID09PSAwO1xuXG4gIHJldHVybiBwcmlzbWEudXNlci5jcmVhdGUoe1xuICAgIGRhdGE6IHtcbiAgICAgIGVtYWlsLFxuICAgICAgbmFtZSxcbiAgICAgIHBhc3N3b3JkSGFzaCxcbiAgICAgIHJvbGU6IGlzRmlyc3RVc2VyID8gXCJhZG1pblwiIDogXCJ1c2VyXCIsXG4gICAgICBjcmVkaXRzOiBpc0ZpcnN0VXNlciA/IDEwMF8wMDAgOiA1XzAwMFxuICAgIH1cbiAgfSk7XG59XG4iXSwibmFtZXMiOlsiUHJpc21hQWRhcHRlciIsImdldFNlcnZlclNlc3Npb24iLCJDcmVkZW50aWFsc1Byb3ZpZGVyIiwiYmNyeXB0IiwieiIsInByaXNtYSIsImNyZWRlbnRpYWxzU2NoZW1hIiwib2JqZWN0IiwiZW1haWwiLCJzdHJpbmciLCJtZXNzYWdlIiwicGFzc3dvcmQiLCJtaW4iLCJhdXRoT3B0aW9ucyIsImFkYXB0ZXIiLCJzZXNzaW9uIiwic3RyYXRlZ3kiLCJtYXhBZ2UiLCJwYWdlcyIsInNpZ25JbiIsInNpZ25PdXQiLCJwcm92aWRlcnMiLCJuYW1lIiwiY3JlZGVudGlhbHMiLCJsYWJlbCIsInR5cGUiLCJhdXRob3JpemUiLCJwYXJzZWQiLCJzYWZlUGFyc2UiLCJzdWNjZXNzIiwiZGF0YSIsInVzZXIiLCJmaW5kVW5pcXVlIiwid2hlcmUiLCJwYXNzd29yZEhhc2giLCJwYXNzd29yZE1hdGNoZXMiLCJjb21wYXJlIiwiaWQiLCJ1bmRlZmluZWQiLCJyb2xlIiwiY3JlZGl0cyIsImNhbGxiYWNrcyIsInRva2VuIiwiTnVtYmVyIiwiand0IiwiZGJVc2VyIiwic2VsZWN0IiwiZ2V0Q3VycmVudFNlc3Npb24iLCJnZXRDdXJyZW50VXNlciIsInNlc3Npb25Vc2VyIiwicmVnaXN0ZXJVc2VyIiwiZXhpc3RpbmciLCJFcnJvciIsImhhc2giLCJpc0ZpcnN0VXNlciIsImNvdW50IiwiY3JlYXRlIl0sInNvdXJjZVJvb3QiOiIifQ==\n//# sourceURL=webpack-internal:///(rsc)/./lib/auth.ts\n");

/***/ }),

/***/ "(rsc)/./lib/prisma.ts":
/*!***********************!*\
  !*** ./lib/prisma.ts ***!
  \***********************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

eval("__webpack_require__.r(__webpack_exports__);\n/* harmony export */ __webpack_require__.d(__webpack_exports__, {\n/* harmony export */   prisma: () => (/* binding */ prisma)\n/* harmony export */ });\n/* harmony import */ var _prisma_client__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! @prisma/client */ \"@prisma/client\");\n/* harmony import */ var _prisma_client__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(_prisma_client__WEBPACK_IMPORTED_MODULE_0__);\n\nconst prisma = global.prisma || new _prisma_client__WEBPACK_IMPORTED_MODULE_0__.PrismaClient({\n    log:  true ? [\n        \"query\",\n        \"info\",\n        \"warn\"\n    ] : 0\n});\nif (true) {\n    global.prisma = prisma;\n}\n//# sourceURL=[module]\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiKHJzYykvLi9saWIvcHJpc21hLnRzIiwibWFwcGluZ3MiOiI7Ozs7OztBQUE4QztBQU92QyxNQUFNQyxTQUNYQyxPQUFPRCxNQUFNLElBQ2IsSUFBSUQsd0RBQVlBLENBQUM7SUFDZkcsS0FBS0MsS0FBc0MsR0FBRztRQUFDO1FBQVM7UUFBUTtLQUFPLEdBQUcsQ0FBUTtBQUNwRixHQUFHO0FBRUwsSUFBSUEsSUFBcUMsRUFBRTtJQUN6Q0YsT0FBT0QsTUFBTSxHQUFHQTtBQUNsQiIsInNvdXJjZXMiOlsid2VicGFjazovL2FpZ2Mtc3R1ZGlvLy4vbGliL3ByaXNtYS50cz85ODIyIl0sInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IFByaXNtYUNsaWVudCB9IGZyb20gXCJAcHJpc21hL2NsaWVudFwiO1xuXG5kZWNsYXJlIGdsb2JhbCB7XG4gIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBuby12YXJcbiAgdmFyIHByaXNtYTogUHJpc21hQ2xpZW50IHwgdW5kZWZpbmVkO1xufVxuXG5leHBvcnQgY29uc3QgcHJpc21hID1cbiAgZ2xvYmFsLnByaXNtYSB8fFxuICBuZXcgUHJpc21hQ2xpZW50KHtcbiAgICBsb2c6IHByb2Nlc3MuZW52Lk5PREVfRU5WID09PSBcImRldmVsb3BtZW50XCIgPyBbXCJxdWVyeVwiLCBcImluZm9cIiwgXCJ3YXJuXCJdIDogW1wid2FyblwiXVxuICB9KTtcblxuaWYgKHByb2Nlc3MuZW52Lk5PREVfRU5WICE9PSBcInByb2R1Y3Rpb25cIikge1xuICBnbG9iYWwucHJpc21hID0gcHJpc21hO1xufVxuIl0sIm5hbWVzIjpbIlByaXNtYUNsaWVudCIsInByaXNtYSIsImdsb2JhbCIsImxvZyIsInByb2Nlc3MiXSwic291cmNlUm9vdCI6IiJ9\n//# sourceURL=webpack-internal:///(rsc)/./lib/prisma.ts\n");

/***/ })

};
;

// load runtime
var __webpack_require__ = require("../../../../webpack-runtime.js");
__webpack_require__.C(exports);
var __webpack_exec__ = (moduleId) => (__webpack_require__(__webpack_require__.s = moduleId))
var __webpack_exports__ = __webpack_require__.X(0, ["vendor-chunks/next","vendor-chunks/next-auth","vendor-chunks/@babel","vendor-chunks/openid-client","vendor-chunks/zod","vendor-chunks/bcryptjs","vendor-chunks/oauth","vendor-chunks/object-hash","vendor-chunks/preact","vendor-chunks/uuid","vendor-chunks/@next-auth","vendor-chunks/yallist","vendor-chunks/preact-render-to-string","vendor-chunks/cookie","vendor-chunks/@panva","vendor-chunks/oidc-token-hash"], () => (__webpack_exec__("(rsc)/./node_modules/next/dist/build/webpack/loaders/next-app-loader.js?name=app%2Fapi%2Fauth%2F%5B...nextauth%5D%2Froute&page=%2Fapi%2Fauth%2F%5B...nextauth%5D%2Froute&appPaths=&pagePath=private-next-app-dir%2Fapi%2Fauth%2F%5B...nextauth%5D%2Froute.ts&appDir=%2FUsers%2Fdoomnaiad%2FDocuments%2FCode%2Fimage-fotura%2Fapp&pageExtensions=tsx&pageExtensions=ts&pageExtensions=jsx&pageExtensions=js&rootDir=%2FUsers%2Fdoomnaiad%2FDocuments%2FCode%2Fimage-fotura&isDev=true&tsconfigPath=tsconfig.json&basePath=&assetPrefix=&nextConfigOutput=&preferredRegion=&middlewareConfig=e30%3D!")));
module.exports = __webpack_exports__;

})();