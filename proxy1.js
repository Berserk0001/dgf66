"use strict";

import http from "http";
import https from "https";
import sharp from "sharp";
import pick from "./pick.js";
import { availableParallelism } from 'os';

// Constants
const DEFAULT_QUALITY = 40;
const MIN_COMPRESS_LENGTH = 1024;
const MIN_TRANSPARENT_COMPRESS_LENGTH = MIN_COMPRESS_LENGTH * 100;
const USER_AGENT = "Bandwidth-Hero Compressor";

/**
 * Determines if image compression should be applied based on request parameters.
 * @param {http.IncomingMessage} req - The incoming HTTP request.
 * @returns {boolean} - Whether compression should be performed.
 */
function shouldCompress(req) {
  const { originType, originSize, webp } = req.params;
  return (
    originType.startsWith("image") &&
    originSize > 0 &&
    !req.headers.range &&
    !(webp && originSize < MIN_COMPRESS_LENGTH) &&
    !(!webp && (originType.endsWith("png") || originType.endsWith("gif")) && originSize < MIN_TRANSPARENT_COMPRESS_LENGTH)
  );
}

/**
 * Copies headers from source to target, logging errors if any.
 * @param {http.IncomingMessage} source - The source of headers.
 * @param {http.ServerResponse} target - The target for headers.
 */
function copyHeaders(source, target) {
  Object.entries(source.headers).forEach(([key, value]) => {
    try {
      target.setHeader(key, value);
    } catch (e) {
      console.log(e.message);
    }
  });
}

/**
 * Redirects the request to the original URL with proper headers.
 * @param {http.IncomingMessage} req - The incoming HTTP request.
 * @param {http.ServerResponse} res - The HTTP response.
 */
function redirect(req, res) {
  if (res.headersSent) return;

  res.setHeader('content-length', 0);
  res.removeHeader('cache-control');
  res.removeHeader('expires');
  res.removeHeader('date');
  res.removeHeader('etag');
  res.setHeader('location', encodeURI(req.params.url));
  res.end();
}

/**
 * Compresses and transforms the image according to request parameters.
 * @param {http.IncomingMessage} req - The incoming HTTP request.
 * @param {http.ServerResponse} res - The HTTP response.
 * @param {http.IncomingMessage} input - The input stream for image data.
 */
/*function compress(req, res, input) {
  const format = req.params.webp ? "webp" : "jpeg";
  const sharpInstance = sharp({
    unlimited: true,
    failOn: "none",
    limitInputPixels: false
  });

  sharp.cache(false);
  sharp.simd(false);
  sharp.concurrency(availableParallelism());

  sharpInstance
    .metadata()
    .then(metadata => {
      if (metadata.height > MAX_HEIGHT) {
        sharpInstance.resize({
          width: null, // Declared width as null
          height: MAX_HEIGHT,
          withoutEnlargement: true
        });
      }
      return sharpInstance
        .grayscale(req.params.grayscale)
        .toFormat(format, { quality: req.params.quality, effort: 0 })
        .on("info", info => {
          res.writeHead(200, {
            "content-type": `image/${format}`,
            "content-length": info.size,
            "x-original-size": req.params.originSize,
            "x-bytes-saved": req.params.originSize - info.size
          });
        })
        .on("data", chunk => {
          res.write(chunk);
        })
        .on("end", () => {
          res.end();
        })
        .on("error", () => redirect(req, res));
    });

  input.pipe(sharpInstance);
}*/

/**
 * Converts a readable stream into a buffer.
 * @param {Readable} stream - The input stream.
 * @returns {Promise<Buffer>} - A promise that resolves to a buffer.
 */

/**
 * Compresses an image and sends the response.
 * @param {http.IncomingMessage} req - The incoming HTTP request.
 * @param {http.ServerResponse} res - The HTTP response.
 * @param {Readable} inputStream - The input image stream.
 */
/**
 * Compresses the input image stream and sends the processed image in the response.
 * @param {http.IncomingMessage} req - The incoming HTTP request.
 * @param {http.ServerResponse} res - The HTTP response.
 * @param {stream.Readable} inputStream - The input stream of image data.
 */
/**
 * Compresses the input image stream and sends the processed image in the response.
 * @param {http.IncomingMessage} req - The incoming HTTP request.
 * @param {http.ServerResponse} res - The HTTP response.
 * @param {stream.Readable} inputStream - The input stream of image data.
 */
/**
 * Compresses the input image stream and pipes the output to the response.
 * @param {http.IncomingMessage} req - The incoming HTTP request.
 * @param {http.ServerResponse} res - The HTTP response.
 * @param {stream.Readable} inputStream - The input stream of image data.
 */
/**
 * Compresses the input image stream and pipes the output to the response.
 * @param {http.IncomingMessage} req - The incoming HTTP request.
 * @param {http.ServerResponse} res - The HTTP response.
 * @param {stream.Readable} inputStream - The input stream of image data.
 */
function compress(req, res, inputStream) {
    const format = req.params.webp ? 'webp' : 'jpeg';
    const compressionQuality = req.params.quality;

    // Create a Sharp instance for transformations
    const transformer = sharp()
        .grayscale(req.params.grayscale)
        .toFormat(format, {
            quality: compressionQuality,
            effort: 0
        });

    // Use metadata to decide on resizing
    sharp(inputStream)
        .metadata()
        .then(metadata => {
            let resizeWidth = null;
            let resizeHeight = null;

            // Handle longstrip images exceeding WebP height limit
            if (metadata.height >= 16383) {
                resizeHeight = 16383;
            }

            // Apply resizing if necessary
            transformer.resize({
                width: resizeWidth,
                height: resizeHeight
            });

            // Set headers and pipe transformed stream to response
            res.setHeader('content-type', `image/${format}`);
            res.setHeader('Access-Control-Allow-Origin', '*');
            res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
            res.setHeader('Cross-Origin-Embedder-Policy', 'unsafe-none');
            inputStream.pipe(transformer).pipe(res);
        })
        .catch(err => {
            console.error("Error fetching metadata or processing image:", err.message);
            redirect(req, res);
        });

    inputStream.on('error', err => {
        console.error("Error reading stream:", err.message);
        redirect(req, res);
    });
}




/**
 * Main proxy handler for bandwidth optimization.
 * @param {http.IncomingMessage} req - The incoming HTTP request.
 * @param {http.ServerResponse} res - The HTTP response.
 */
function hhproxy(req, res) {
  let url = req.query.url;
  if (!url) return res.end("bandwidth-hero-proxy");

  req.params = {
    url: decodeURIComponent(url),
    webp: !req.query.jpeg,
    grayscale: req.query.bw != 0,
    quality: parseInt(req.query.l, 10) || DEFAULT_QUALITY
  };

  if (req.headers["via"] === "1.1 bandwidth-hero" &&
    ["127.0.0.1", "::1"].includes(req.headers["x-forwarded-for"] || req.ip)) {
    return redirect(req, res);
  }

  const parsedUrl = new URL(req.params.url);
  const options = {
    headers: {
      ...pick(req.headers, ["cookie", "dnt", "referer", "range"]),
      "User-Agent": USER_AGENT,
      "X-Forwarded-For": req.headers["x-forwarded-for"] || req.ip,
      "Via": "1.1 bandwidth-hero"
    },
    rejectUnauthorized: false
  };

  const requestModule = parsedUrl.protocol === 'https:' ? https : http;

  try {
    let originReq = requestModule.request(parsedUrl, options, originRes => {
      if (originRes.statusCode >= 400 || (originRes.statusCode >= 300 && originRes.headers.location)) {
        originRes.resume();
        return redirect(req, res);
      }

      copyHeaders(originRes, res);
      res.setHeader("Content-Encoding", "identity");
      res.setHeader("Access-Control-Allow-Origin", "*");
      res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
      res.setHeader("Cross-Origin-Embedder-Policy", "unsafe-none");

      req.params.originType = originRes.headers["content-type"] || "";
      req.params.originSize = parseInt(originRes.headers["content-length"] || "0");

      if (shouldCompress(req)) {
        compress(req, res, originRes);
      } else {
        res.setHeader("X-Proxy-Bypass", 1);
        ["accept-ranges", "content-type", "content-length", "content-range"].forEach(header => {
          if (originRes.headers[header]) {
            res.setHeader(header, originRes.headers[header]);
          }
        });

        originRes.pipe(res);
      }
    });

    originReq.on('error', () => req.socket.destroy());
    originReq.end();
  } catch (err) {
    if (err.code === "ERR_INVALID_URL") {
      res.status(400).send("Invalid URL");
    } else {
      redirect(req, res);
      console.error(err);
    }
  }
}

export default hhproxy;
