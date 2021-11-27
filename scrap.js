const rp = require('request-promise');
const path = require('path')
const axios = require('axios')
const fs = require('fs')
const {JSDOM} = require('jsdom')

const haunterProductSelector = "body main#main div#content div.container div.o-page__row.o-page__row--listing div.o-page__content div article div ul.c-listing__items.js-plp-products-list"
const productImageSelector = 'body main#main div#content div.o-page.js-product-page.c-product-page div article section.c-product__gallery div.c-gallery ul.c-gallery__items.js-album-usage-ga'

let imageCounter = 0

async function retrieveProductLinks(haunterPage) {
    try {
    const productLinks = []
    const html = await rp(haunterPage)
	console.log('INFO: receiving productLink Response from treasury ');
    const dom = new JSDOM(html)

    const select = dom.window.document.querySelector(haunterProductSelector)

    const children = select.children;
    for (var i = 0; i < children.length; i++) {
        var li = children[i];
        const productLink = li.querySelector('div a.c-product-box__img.c-promotion-box__image.js-url.js-product-item.js-product-url').getAttribute('href');
        productLinks.push(productLink)
        console.log('INFO: productLink', productLinks.length, 'gathered');
    }
    return productLinks;
    } catch (error) {
        console.log('error on product link: ', error);
    }
}

async function retrieveProductImagesLink(productPageUrl) {
    try {
    const productImageLinks = []
    const productPage = 'https://www.digikala.com' + productPageUrl;
    const html = await rp(encodeURI(productPage))
    const dom = new JSDOM(html)

    const select = dom.window.document.querySelector(productImageSelector)

    const children = select.children;
    for (var i = 0; i < children.length; i++) {
        var li = children[i];
        const productImageLink = li.querySelector('div.thumb-wrapper img').getAttribute('data-src');
        const link = await qualifyImageLink(productImageLink)
        productImageLinks.push(link)
        console.log('INFO: productImageLinks', productImageLinks.length, 'gathered');

    }
    return productImageLinks

    } catch (error) {
        console.log('error on product image link: ', error);
    }
}

async function qualifyImageLink(imageUrl) {
    // the "/watermark,image_ZGstdy8xLnBuZw==,t_90,g_nw,x_15,y_15" is not needed because it's for watermark
    // High Quality: https://dkstatics-public.digikala.com/digikala-products/ef13c7a5f6fe8c20501f4907b469353a4cf5b9c6_1634449329.jpg?x-oss-process=image/resize,h_1600/quality,q_80/watermark,image_ZGstdy8xLnBuZw==,t_90,g_nw,x_15,y_15
    //Thumb: https://dkstatics-public.digikala.com/digikala-products/ef13c7a5f6fe8c20501f4907b469353a4cf5b9c6_1634449329.jpg?x-oss-process=image/resize,m_lfit,h_115,w_115/quality,q_60
    const index = imageUrl.indexOf('resize,')
    const slicedUrl = imageUrl.slice(0, index)
    const newImageUrl = slicedUrl + 'resize,h_1600/quality,q_70'; // quality 70%
    return newImageUrl
}

async function downloadImage(imageUrl, pageNumber, imageNumber){
    console.log('INFO: imageDownloading ', imageNumber);
    let imageName = `p-${pageNumber}-image${imageNumber}.jpg`

    const dir = path.resolve(__dirname, 'images', imageName)

    const writer = fs.createWriteStream(dir)

    try {
        const response = await axios({
            url: imageUrl,
            method: 'GET',
            responseType: 'stream'
        })
        response.data.pipe(writer)

        return new Promise((resolve, reject) => {
            writer.on('finish', resolve)
            writer.on('error', reject)
        })

    } catch (error) {
        console.log('error on image download: ', error);
    }
}

async function start(){
	const fromPage = process.argv[2]
	const toPage = process.argv[3] // inclusive

	for(let pageNumber = Number(fromPage); pageNumber <= Number(toPage); pageNumber++){
		let imageNumber = 0
		const starterLink = pageNumber === 1 ? "https://www.digikala.com/treasure-hunt/products" : `https://www.digikala.com/treasure-hunt/products/?pageno=${pageNumber}&sortby=4`
		const productLinks = await retrieveProductLinks(starterLink)
		for (let i = 0; i<productLinks.length; i++){
			const imageLinks = await retrieveProductImagesLink(productLinks[i])
			for (let j = 0; j<imageLinks.length; j++){
				imageNumber = imageNumber + 1
				await downloadImage(imageLinks[j], pageNumber, imageNumber)
			}
		}
	}
	console.log('requested pages crawled.')
}
start()
