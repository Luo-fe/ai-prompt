/**
 * electron-builder afterPack 钩子
 *
 * 在 app 目录被打包后、生成安装程序前执行。
 * 当前为空实现（no-op），保留 hook 占位以便未来扩展（如清理文件、注入版本信息等）。
 *
 * @param {Object} context - electron-builder 构建上下文
 *   - appOutDir: 应用输出目录
 *   - outDir: 总输出目录
 *   - arch: 架构
 *   - targets: 目标列表
 *   - packager: 打包器实例
 *   - electronPlatformName: 平台名
 */
exports.default = async function afterPack(context) {
  // no-op
};
