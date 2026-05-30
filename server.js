import express from 'express';
import Anthropic from '@anthropic-ai/sdk';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { existsSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
app.use(express.json());

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

app.post('/api/ai-notes', async (req, res) => {
  const { customerName, vehicleYear, vehicleMake, vehicleModel, mileage, services, techNotes, grandTotal } = req.body;

  const fallback = "Thank you for choosing Ocasio Mechanical Services. Your vehicle has been serviced with quality parts and professional care. We look forward to seeing you at your next scheduled maintenance.";

  if (!process.env.ANTHROPIC_API_KEY) {
    return res.json({ notes: fallback });
  }

  try {
    const message = await client.messages.create({
      model: 'claude-opus-4-5',
      max_tokens: 1024,
      messages: [{
        role: 'user',
        content: `You are the service assistant for Ocasio Mechanical Services LLC, a professional mobile automotive service in Florida. Write a 2-sentence professional service summary for this receipt. Warm, confident, honest tone. Include a next service reminder. No greeting, just the note.\n\nCustomer: ${customerName}\nVehicle: ${vehicleYear} ${vehicleMake} ${vehicleModel} at ${mileage} miles\nServices: ${services}\nTech notes: ${techNotes || 'none'}\nTotal: $${Number(grandTotal).toFixed(2)}`
      }]
    });

    const notes = message.content?.map(b => b.text || '').join('') || fallback;
    res.json({ notes });
  } catch (e) {
    console.error('AI notes error:', e.message);
    res.json({ notes: fallback });
  }
});

// Serve built frontend in production
const distPath = join(__dirname, 'dist');
if (existsSync(distPath)) {
  app.use(express.static(distPath));
  app.get('*', (req, res) => {
    res.sendFile(join(distPath, 'index.html'));
  });
}

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`API server running on port ${PORT}`));
