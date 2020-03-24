var Jimp = require('jimp');
exports.overlayText = function(imgPath, text, x, y, returnPath){
    return Jimp.read(imgPath)
    .then(function (image) {
        loadedImage = image;
        return Jimp.loadFont(Jimp.FONT_SANS_64_WHITE);
    })
    .then(function (font) {
        loadedImage.print(font, x, y, text)
                   .write(returnPath);
    })
    .catch(function (err) {
        console.error(err);
    });
}
