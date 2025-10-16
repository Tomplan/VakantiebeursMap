// Leaflet.Icon.Glyph plugin - minified version
// Source: https://github.com/Leaflet/Leaflet.Icon.Glyph/blob/master/Leaflet.Icon.Glyph.js
// (MIT License)
(function(factory, window) {
    if (typeof define === 'function' && define.amd) {
        define(['leaflet'], factory);
    } else if (typeof module !== 'undefined') {
        module.exports = factory(require('leaflet'));
    } else {
        factory(window.L);
    }
}(function(L) {
    L.Icon.Glyph = L.Icon.extend({
        options: {
            iconSize: [32, 37],
            iconAnchor: [16, 37],
            popupAnchor: [0, -28],
            className: '',
            prefix: '',
            glyph: '',
            glyphColor: 'black',
            glyphSize: '11px',
            glyphAnchor: [0, 0],
            bgPos: null
        },
        createIcon: function() {
            var div = document.createElement('div');
            var options = this.options;
            if (options.bgPos) {
                div.style.backgroundPosition =
                    (-options.bgPos[0]) + 'px ' + (-options.bgPos[1]) + 'px';
            }
            if (options.className) {
                div.className = options.className;
            }
            // Voeg standaard marker-afbeelding toe als achtergrond
            if (options.iconUrl) {
                div.style.backgroundImage = 'url(' + options.iconUrl + ')';
                div.style.backgroundSize = 'contain';
                div.style.width = options.iconSize[0] + 'px';
                div.style.height = options.iconSize[1] + 'px';
            }
            var glyph = document.createElement('div');
            glyph.innerHTML = options.prefix ? options.prefix + ' ' + options.glyph : options.glyph;
            glyph.style.color = options.glyphColor;
            glyph.style.fontSize = options.glyphSize;
            glyph.style.position = 'relative';
            glyph.style.left = options.glyphAnchor[0] + 'px';
            glyph.style.top = options.glyphAnchor[1] + 'px';
            glyph.style.textAlign = 'center';
            glyph.style.width = '100%';
            glyph.style.lineHeight = options.iconSize[1] + 'px';
            div.appendChild(glyph);
            this._setIconStyles(div, 'icon');
            return div;
        },
        createShadow: function() {
            var options = this.options;
            if (options.shadowUrl) {
                var img = document.createElement('img');
                img.src = options.shadowUrl;
                // Gebruik shadowSize indien opgegeven
                if (options.shadowSize) {
                    img.style.width = options.shadowSize[0] + 'px';
                    img.style.height = options.shadowSize[1] + 'px';
                } else {
                    img.style.width = '41px';
                    img.style.height = '41px';
                }
                // Gebruik shadowAnchor indien opgegeven
                if (options.shadowAnchor) {
                    img.style.position = 'absolute';
                    img.style.left = options.shadowAnchor[0] + 'px';
                    img.style.top = options.shadowAnchor[1] + 'px';
                }
                return img;
            }
            return null;
        }
    });
    L.icon.glyph = function(options) {
        return new L.Icon.Glyph(options);
    };
    return L;
}, window));
