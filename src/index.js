var fs = require('fs'),
    path = require('path'),
    paths = new Map();

module.exports = function (options) {
    options = options || {};
    include = options.include || [];
    return {
        resolveId: function (importee, importer) {
            if (importee === 'rollup-plugin-bundle-worker') {
                return path.resolve(__dirname, 'workerhelper.js');
            }
            else if (importee.indexOf('worker!') === 0) {
                var name = importee.split('!')[1],
                    target = path.resolve(path.dirname(importer), name);

                paths.set(target, name);
                return target;
            }
            else if (include.indexOf(importee) >= 0) {
                target = path.resolve(path.dirname(importer), importee);
                paths.set(target, importee);
                return target;
            }
        },

        /**
         * Do everything in load so that code loaded by the plugin can still be transformed by the
         * rollup configuration
         */
        load: function (id) {
            if (!paths.has(id)) {
                return;
            }

            var code = [
                    `import shimWorker from 'rollup-plugin-bundle-worker';`,
                    `export default new shimWorker(${JSON.stringify(paths.get(id))}, function (window, document) {`,
                    `var self = this;`,
                    fs.readFileSync(id, 'utf-8'),
                    `\n});`
                ].join('\n');

            return code;
        }
    };
}
