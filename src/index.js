var fs = require('fs'),
    path = require('path'),
    paths = new Map();

module.exports = function (options) {
    options = options || {};
    include = options.include || [];
    var name = 'bundle-worker';
    var plugins;
    function resolver(importee, importer) {
        var resolved;
        if (Array.isArray(plugins) && plugins.length > 0) {
            resolved = plugins.filter(function(p) {
                    return p.name !== name && !!p.resolveId;
                })
                .reduce(function(acc, p) {
                    return acc || p.resolveId(importee, importer);
                });
        }

        return resolved || path.resolve(path.dirname(importer), importee);
    }
    return {
        name: name,
        options: function(opts) {
            plugins = opts.plugins;
        },
        resolveId: function (importee, importer) {
            if (importee === 'rollup-plugin-bundle-worker') {
                return path.resolve(__dirname, 'workerhelper.js');
            }
            else if (importee.indexOf('worker!') === 0) {
                var name = importee.split('!')[1],
                    target = resolver(name, importer);

                paths.set(target, name);
                return target;
            }
            else if (include.indexOf(importee) >= 0) {
                var target = resolver(importee, importer);
                paths.set(target, importee);
                return target;
            }
            else {
                return null;
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
