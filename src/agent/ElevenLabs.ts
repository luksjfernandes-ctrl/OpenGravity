import { config } from '../config.js';

export async function generateSpeech(text: string): Promise<Buffer> {
  const apiKey = config.ELEVENLABS_API_KEY;
  if (!apiKey) throw new Error("ElevenLabs API key is missing from config.");

  // Using a stable multilingual voice (Adam - pNInz6obpgDQGcFmaJgB)
  const voiceId = "pNInz6obpgDQGcFmaJgB";
  
  const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}?output_format=mp3_44100_128`, {
    method: 'POST',
    headers: {
      'xi-api-key': apiKey,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      text,
      model_id: "eleven_multilingual_v2",
      voice_settings: {
        stability: 0.5,
        similarity_boost: 0.75
      }
    })
  });

  if (!response.ok) {
    throw new Error(`ElevenLabs error: ${await response.text()}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}
