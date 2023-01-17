const puppeteer = require("puppeteer");
const cheerio = require("cheerio");
const XLSX = require("xlsx");
const fs = require("fs");
const fsp = require("fs").promises;

async function writeFile(contenido, nombre) {
  try {
    await fsp.writeFile(nombre, contenido);
    console.log("El archivo ha sido guardado!");
  } catch (err) {
    console.log("Error: ", err);
  }
}

function appendFile(contenido, nombre) {
  // Agrega contenido a un archivo existente
  fs.appendFile(nombre, contenido, (err) => {
    if (err) {
      console.log(err);
    }
  });
}

function appendFileSync(contenido, nombre) {
  try {
    fs.appendFileSync(nombre, contenido);
  } catch (err) {
    console.log("Error: ", err);
  }
}

function getRandomInt(min, max) {
  // Obtiene un número entero aleatorio entre un mínimo y un máximo
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function formatTime(timeInSeconds) {
  // Permite formatear el tiempo en segundos a hh:mm:ss
  const x = Math.floor(timeInSeconds);
  let salida = "";

  const hours = Math.floor(x / 3600);
  if (hours < 10) {
    salida = salida + "0";
  }
  salida = salida + String(hours) + ":";

  const minutes = Math.floor((x % 3600) / 60);
  if (minutes < 10) {
    salida = salida + "0";
  }
  salida = salida + String(minutes) + ":";

  const seconds = x % 60;
  if (seconds < 10) {
    salida = salida + "0";
  }
  salida = salida + String(seconds);

  return salida;
}

const workbook = XLSX.readFile("./inventario_enero_2023.xlsx"); // Archivo
const sheet = workbook.Sheets[workbook.SheetNames[0]]; // Hoja
const data = XLSX.utils.sheet_to_json(sheet); // Data -> JSON
var links = "";
const startTime = new Date(); // Inicio de ejecución
// const len = data.length;
const len = data.length; // Probar solo unos cuantos
writeFile("indice|nombre|link\n", "./csv/paginas.csv");

async function main() {
  // Abrir navegador
  const browser = await puppeteer.launch();

  // Iterar por cada producto del excel
  for (let i = 0; i < len; i++) {
    const nombreColumna = data[i].Producto.replace(",", ".")
      .replaceAll("/", "_")
      .replaceAll(" ", "_")
      .replaceAll("|", "%%%");
    links = links + nombreColumna + "|";
    // Escribir nombre del producto
    appendFileSync(
      String(i) +
        "|" +
        data[i].Producto.replaceAll(",", ".")
          .replaceAll("/", "_")
          .replaceAll(" ", "_") +
        "|",
      "./csv/paginas.csv"
    );

    // Ruta a consultar
    const searchUrl =
      "https://www.google.com/search?q=" +
      data[i].Producto.replaceAll(" ", "+") +
      "&source=lnms&tbm=isch&sa=X";

    const page = await browser.newPage(); // Abrir una página
    await page.goto(searchUrl); // Cargar la url
    await page.waitForTimeout(getRandomInt(2000, 4000)); // Esperar a que cargue

    // Obtener html de la página cargada
    const html = await page.evaluate(() => document.body.innerHTML);
    const $ = cheerio.load(html); // DOM (function)

    // Obtener la etiqueta <img> de búsqueda
    const image = $(".islrc").children().next().children().next().next();
    var link = "x";
    try {
      link = image.attr().href; // Obtengo la página a la que apunta
    } catch (err) {
      console.log(err);
    }

    console.log(link);
    links = links + link + "\n";
    // Escribir en el archivo
    appendFileSync(link + "\n", "./csv/paginas.csv");

    // Mostrar porcentaje de avance y tiempo de espera
    const currentTime = new Date();
    console.log(
      String(i) +
        ".\t" +
        String((i / len) * 100) +
        "%\t" +
        formatTime((currentTime.getTime() - startTime.getTime()) / 1000)
    );

    // Cerrar pestaña
    page.close();
  }

  // Cerrar navegador
  browser.close();
  console.log("Extracción de datos terminada");
}

main();
