var module_dir_tree =
/******/ (function(modules) { // webpackBootstrap
/******/ 	// The module cache
/******/ 	var installedModules = {};
/******/
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/
/******/ 		// Check if module is in cache
/******/ 		if(installedModules[moduleId]) {
/******/ 			return installedModules[moduleId].exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = installedModules[moduleId] = {
/******/ 			i: moduleId,
/******/ 			l: false,
/******/ 			exports: {}
/******/ 		};
/******/
/******/ 		// Execute the module function
/******/ 		modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);
/******/
/******/ 		// Flag the module as loaded
/******/ 		module.l = true;
/******/
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/
/******/
/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = modules;
/******/
/******/ 	// expose the module cache
/******/ 	__webpack_require__.c = installedModules;
/******/
/******/ 	// define getter function for harmony exports
/******/ 	__webpack_require__.d = function(exports, name, getter) {
/******/ 		if(!__webpack_require__.o(exports, name)) {
/******/ 			Object.defineProperty(exports, name, { enumerable: true, get: getter });
/******/ 		}
/******/ 	};
/******/
/******/ 	// define __esModule on exports
/******/ 	__webpack_require__.r = function(exports) {
/******/ 		if(typeof Symbol !== 'undefined' && Symbol.toStringTag) {
/******/ 			Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });
/******/ 		}
/******/ 		Object.defineProperty(exports, '__esModule', { value: true });
/******/ 	};
/******/
/******/ 	// create a fake namespace object
/******/ 	// mode & 1: value is a module id, require it
/******/ 	// mode & 2: merge all properties of value into the ns
/******/ 	// mode & 4: return value when already ns object
/******/ 	// mode & 8|1: behave like require
/******/ 	__webpack_require__.t = function(value, mode) {
/******/ 		if(mode & 1) value = __webpack_require__(value);
/******/ 		if(mode & 8) return value;
/******/ 		if((mode & 4) && typeof value === 'object' && value && value.__esModule) return value;
/******/ 		var ns = Object.create(null);
/******/ 		__webpack_require__.r(ns);
/******/ 		Object.defineProperty(ns, 'default', { enumerable: true, value: value });
/******/ 		if(mode & 2 && typeof value != 'string') for(var key in value) __webpack_require__.d(ns, key, function(key) { return value[key]; }.bind(null, key));
/******/ 		return ns;
/******/ 	};
/******/
/******/ 	// getDefaultExport function for compatibility with non-harmony modules
/******/ 	__webpack_require__.n = function(module) {
/******/ 		var getter = module && module.__esModule ?
/******/ 			function getDefault() { return module['default']; } :
/******/ 			function getModuleExports() { return module; };
/******/ 		__webpack_require__.d(getter, 'a', getter);
/******/ 		return getter;
/******/ 	};
/******/
/******/ 	// Object.prototype.hasOwnProperty.call
/******/ 	__webpack_require__.o = function(object, property) { return Object.prototype.hasOwnProperty.call(object, property); };
/******/
/******/ 	// __webpack_public_path__
/******/ 	__webpack_require__.p = "";
/******/
/******/
/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__(__webpack_require__.s = "./js/dirTree.js");
/******/ })
/************************************************************************/
/******/ ({

/***/ "./js/dirTree.js":
/*!***********************!*\
  !*** ./js/dirTree.js ***!
  \***********************/
/*! exports provided: addRelUrlToTree, getChildTree, getPageParams, getNonMetaNodeKeys, getPageKeys, getNonDirPageKeys, getChildDirKeys, getAllPaths */
/*! all exports used */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
eval("__webpack_require__.r(__webpack_exports__);\n/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, \"addRelUrlToTree\", function() { return addRelUrlToTree; });\n/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, \"getChildTree\", function() { return getChildTree; });\n/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, \"getPageParams\", function() { return getPageParams; });\n/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, \"getNonMetaNodeKeys\", function() { return getNonMetaNodeKeys; });\n/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, \"getPageKeys\", function() { return getPageKeys; });\n/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, \"getNonDirPageKeys\", function() { return getNonDirPageKeys; });\n/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, \"getChildDirKeys\", function() { return getChildDirKeys; });\n/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, \"getAllPaths\", function() { return getAllPaths; });\nlet pageRelUrlTreeMETAkey = \"__meta\";\n\n\nfunction addRelUrlToTree(item, pageParams) {\n    // console.debug(item, pageParams);\n    var parts = item.split(\"/\").filter(x => x.length > 0);\n    // Navigate with the prefix into the tree. \n    var cursor = pageRelUrlTree;\n    parts.forEach(function(part){\n        if(!cursor[part]) cursor[part] = {};\n        cursor = cursor[part];\n    });\n    cursor[pageRelUrlTreeMETAkey] = pageParams;\n}\n\nfunction getChildTree(relativeUrl) {\n    var parts = relativeUrl.split(\"/\").filter(x => x.length > 0);\n    var cursor = pageRelUrlTree;\n    parts.forEach(function(part){\n        if(!cursor[part]) cursor[part] = {};\n        cursor = cursor[part];\n    });\n    return cursor;\n}\n\nfunction getPageParams(url) {\n    let pageParams = getChildTree(url)[pageRelUrlTreeMETAkey] || {};\n    return pageParams;\n}\n\nfunction getNonMetaNodeKeys(tree) {\n    return Object.keys(tree).filter(x => x != pageRelUrlTreeMETAkey);\n}\n\nfunction getPageKeys(tree) {\n    return getNonMetaNodeKeys(tree).filter(x => pageRelUrlTreeMETAkey in tree[x]);\n}\n\nfunction getNonDirPageKeys(tree) {\n    return getPageKeys(tree).filter(x => getNonMetaNodeKeys(tree[x]).length == 0);\n}\n\nfunction getChildDirKeys(tree) {\n    return getNonMetaNodeKeys(tree).filter(x => getNonMetaNodeKeys(tree[x]).length > 0);\n}\n\nfunction getAllPaths(tree, prefix_in) {\n    var prefix = prefix_in  || \"/\";\n    console.assert(prefix.endsWith(\"/\"));\n    let nonDirPageKeys = getNonDirPageKeys(tree);\n    let paths = nonDirPageKeys.map(x => `${prefix}${x}/`);\n    let childDirKeys = getChildDirKeys(tree);\n    childDirKeys.forEach(childDirKey => {\n        paths = paths.concat(getAllPaths(tree[childDirKey], `${prefix}${childDirKey}/`));\n    });\n    return paths;\n}\n\n\n\n//# sourceURL=webpack://module_%5Bname%5D/./js/dirTree.js?");

/***/ })

/******/ });