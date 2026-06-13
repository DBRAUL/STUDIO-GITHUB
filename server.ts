import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Allow high limits since images can be large
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));

  // Express API Route for Gemini Odometer OCR
  app.post("/api/gemini/ocr", async (req: express.Request, res: express.Response) => {
    try {
      const { image } = req.body;
      if (!image) {
        return res.status(400).json({ error: "No image provided" });
      }

      console.log(`[OCR Server] Received image of length ${image.length}. Processing starts...`);
      let mimeType = "image/jpeg";
      let base64Data = image;

      if (image.startsWith("data:")) {
        const match = image.match(/^data:([^;]+);base64,(.+)$/);
        if (match) {
          mimeType = match[1];
          base64Data = match[2];
          console.log(`[OCR Server] Extracted mimeType: ${mimeType}, base64 length: ${base64Data.length}`);
        } else {
          console.warn("[OCR Server] image starts with 'data:' but regex match fell through.");
        }
      } else {
        console.log(`[OCR Server] Input image does not start with data URL prefix, assuming JPEG raw base64. length: ${base64Data.length}`);
      }

      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        console.error("[OCR Server] Missing GEMINI_API_KEY environment variable.");
        return res.status(500).json({ error: "GEMINI_API_KEY is not defined in the workspace secrets or environment." });
      }

      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          }
        }
      });

      const imagePart = {
        inlineData: {
          mimeType,
          data: base64Data,
        },
      };

      const textPart = {
        text: `You are an expert vehicle dashboard analyzer. Look closely at the image of the vehicle dashboard instrument. There might be a speedometer (typically a circular dial or numbers like 20, 40, 60, 80, 100, 120, 140, 160) and one or two odometers (which can be electronic digital LCD displays or analog mechanical rolling cylinders/drums).
1. The main odometer tracks the total accumulated mileage of the vehicle and is usually a 5, 6, or 7-digit number (e.g., '151517').
2. The trip odometer (sometimes located below or adjacent to the main odometer) is a shorter number (often 3 or 4 digits, e.g., '6536').

Your task:
- Identify and extract the MAIN TOTAL accumulated mileage number (which corresponds to total kilometers or miles).
- Do not confuse it with speedometer markings (20, 40, 60, 80, 100, 120, etc.) or unit indicators (MPH, km/h).
- Do not confuse it with the trip odometer (e.g., '6536'), which is usually shorter and placed below/above.
- Extract only the digits of the main total odometer and return it as a pure integer under the 'kmValue' key in the required JSON structure.
- If you see no legible main odometer reading, return null.`,
      };

      console.log("[OCR Server] Calling Gemini API (gemini-3.5-flash)...");
      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: { parts: [imagePart, textPart] },
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              kmValue: {
                type: Type.INTEGER,
                description: "The extracted numerical mileage reading from the odometer instrument. If you cannot see it, return null."
              }
            }
          }
        }
      });

      const text = response.text || "{}";
      console.log(`[OCR Server] Gemini response text: ${text}`);
      const parsed = JSON.parse(text);
      console.log("[OCR Server] Parsed result:", parsed);
      return res.json(parsed);
    } catch (error: any) {
      console.error("[OCR Server] Gemini OCR server error: ", error);
      return res.status(500).json({ error: error?.message || "Error processing image through Gemini OCR" });
    }
  });

  // Vite middleware for development, Static serve for production
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
