var Jimp = require('jimp');
exports.overlayText = async function(imgPath, text, x, y, returnPath){
    const image = await Jimp.read(imgPath)
    const font = await Jimp.loadFont(Jimp.FONT_SANS_64_WHITE)
    image.print(font, x, y, text)
    await image.writeAsync(returnPath)
}
exports.overlayImg = async function(imgPath, x, y, overlayImgPath, returnPath){
    const image = await Jimp.read(imgPath)
    const overlayImage = await Jimp.read(overlayImgPath)
    image.composite(overlayImage, x, y)
    await image.writeAsync(returnPath)
}
