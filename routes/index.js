const express = require("express");
const puppeteer = require("puppeteer");
const handlebars = require("handlebars");
const path = require("path");
//required if you are using handle bar helper functions
require("handlebars-helpers")();
const uuid = require("uuid-random");
const router = express.Router();

router.post("/generatepdf", (req, res, next) => {
  generatePdf(req, res);
});
async function startBrowser() {
  const browser = await puppeteer.launch({
          args: ["--no-sandbox", "--disable-setuid-sandbox"],
          headless: true,
  })
  const page = await browser.newPage();
  return {browser,page}
}
async function generatePdf(req, res) {
  try {
    if (!req.files || !req.files.htmlTemplateFile) {
      res.status = 400;
      res.send({
        status: false,
        message: "Html template file not uploaded",
      });
      return;
    } else {
      let filePathExtension = path.extname(req.files.htmlTemplateFile.name);
      if (filePathExtension !== ".html") {
        res.send({
          status: false,
          message: "Invalid html file uploaded",
        });
        return;
      }
    }
    if (!req.files.jsonData) {
      res.status = 400;
      res.send({
        status: false,
        message: "Json data not provided",
      });
      return;
    } else {
      var filePathExtension = path.extname(req.files.jsonData.name);
      if (filePathExtension !== ".json") {
        res.send({
          status: false,
          message: "Invalid json file uploaded",
        });
        return;
      }
    }

    let file = req.files.htmlTemplateFile.data.toString();
    let fileName = `${uuid()}.pdf`;
    const jsonData = JSON.parse(req.files.jsonData.data);
    let options = {
      width: "1230px",
      displayHeaderFooter: true,
      margin: {
        top: "100px",
        bottom: "50px",
        right: "20px",
        left: "20px",
      },
      printBackground: true,
      format: "A4",
      headerTemplate:
        '<span style="font-size: 10px; width: 100%; height: 20px; background-color: black; color: white; margin: 20px;">I live in Dogwarts</span>',
      footerTemplate:
        '<div style="margin-left:15px; margin-right:15px; border-top: 1px solid rgb(166, 166, 166); display:flex; justify-content:space-between; font-size:10px; padding-right:20px; width:100%">' +
        '<div style="padding-left:5px; padding-top:5px;">Pagina <span class="pageNumber"></span> de <span class="totalPages"></span></div>' +
        `<div style="padding-top:5px;">${new Date().toISOString()}</div>` +
        "</div>",
    };
    try {
      const template = handlebars.compile(file);
      const html = template(jsonData);

      const { browser, page } = await startBrowser();
      await page.setJavaScriptEnabled(false);
      await page.setContent(html, { waitUntil: ["domcontentloaded", "load", "networkidle0"] });
      await page.addStyleTag({ content: "@page:first {margin-top: 0;} @page{ margin-bottom: 50px}" });
      const buffer = await page.pdf(options);
      browser
        .close()
        .then(() => {
        res
          .set({
            "Content-Type": "application/pdf",
            "Content-Length": buffer.length,
            "Content-Disposition":
              "attachment; filename=" + fileName,
          })
          .send(buffer);
      });
    } catch (error) {
      res.status(422).send(error);
    }
  } catch (error) {
    res.status(422).send(error);
  }
}

module.exports = router;
