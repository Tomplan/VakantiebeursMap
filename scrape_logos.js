// Scraper voor 4x4vakantiebeurs.nl carousel
// Haalt alle logo-info uit HTML, downloadt logo's, maakt Excel
const fs = require('fs');
const xlsx = require('xlsx');
const cheerio = require('cheerio');

const htmlFile = 'carousel.html'; // Zet hier je HTML-bestand
const excelFile = 'logos.xlsx';

const html = fs.readFileSync(htmlFile, 'utf8');
const $ = cheerio.load(html);

const rows = [];
const slides = $('.swiper-slide');
console.log(`Aantal gevonden slides: ${slides.length}`);
slides.each((i, el) => {
  const slide = $(el);
  const a = slide.find('a');
  const imgDiv = slide.find('.elementor-carousel-image');
  const href = a.attr('href') || '';
  const target = a.attr('target') || '';
  const ariaLabel = imgDiv.attr('aria-label') || '';
  let bgImg = imgDiv.attr('style') || '';
  // Decodeer HTML-entiteiten (zoals &#039;) naar '
  bgImg = bgImg.replace(/&#039;/g, "'");
  const bgUrlMatch = bgImg.match(/url\(['"]?(.*?)['"]?\)/);
  const logoUrl = bgUrlMatch ? bgUrlMatch[1] : '';
  const slideIndex = slide.attr('data-swiper-slide-index') || '';
  const slideAriaLabel = slide.attr('aria-label') || '';
  console.log(`Slide ${i}: index=${slideIndex}, ariaLabel=${ariaLabel}, href=${href}, logoUrl=${logoUrl}`);
  rows.push({
    slideIndex,
    slideAriaLabel,
    ariaLabel,
    href,
    target,
    logoUrl
  });
});

const ws = xlsx.utils.json_to_sheet(rows);
const wb = xlsx.utils.book_new();
xlsx.utils.book_append_sheet(wb, ws, 'Logos');
xlsx.writeFile(wb, excelFile);

console.log('Klaar! Excel met alle info gegenereerd.');
