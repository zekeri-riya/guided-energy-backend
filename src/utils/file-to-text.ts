import pdfParse from 'pdf-parse';
import mammoth from 'mammoth';
import Tesseract from 'tesseract.js';
import axios from 'axios';
import { Readable } from 'stream';

async function fetchFile(url: string): Promise<Buffer> {
  const response = await axios({
    url,
    method: 'GET',
    responseType: 'arraybuffer',
  });
  return Buffer.from(response.data);
}

async function pdfToText(pdfBuffer: Buffer): Promise<string> {
  const data = await pdfParse(pdfBuffer);
  return data.text;
}

async function docxToText(docxBuffer: Buffer): Promise<string> {
  const result = await mammoth.extractRawText({ buffer: docxBuffer });
  return result.value;
}

async function imageToText(imageBuffer: Buffer): Promise<string> {
  const {
    data: { text },
  } = await Tesseract.recognize(imageBuffer, 'eng', {
    logger: (m) => console.log(m),
  });
  return text;
}

export async function urlToFileText(url: string): Promise<string> {
  const buffer = await fetchFile(url);
  const fileExtension = url.split('.').pop()?.toLowerCase();

  switch (fileExtension) {
    case 'pdf':
      return pdfToText(buffer);
    case 'docx':
      return docxToText(buffer);
    case 'png':
    case 'jpg':
    case 'jpeg':
      return imageToText(buffer);
    default:
      throw new Error('Unsupported file type');
  }
}
