import { MsEdgeTTS, OUTPUT_FORMAT } from 'msedge-tts';

// Free TTS via Microsoft Edge — no API key needed
// Voice: pt-BR-AntonioNeural (male, Brazilian Portuguese)
// Alternatives: pt-BR-FranciscaNeural (female)
const VOICE = 'pt-BR-AntonioNeural';
const FORMAT = OUTPUT_FORMAT.AUDIO_24KHZ_96KBITRATE_MONO_MP3;

export async function generateSpeech(text: string): Promise<Buffer> {
  const tts = new MsEdgeTTS();
  await tts.setMetadata(VOICE, FORMAT as any);
  
  const { audioStream } = await tts.toStream(text);
  
  return new Promise<Buffer>((resolve, reject) => {
    const chunks: Buffer[] = [];
    audioStream.on('data', (chunk: Buffer) => chunks.push(chunk));
    audioStream.on('end', () => resolve(Buffer.concat(chunks)));
    audioStream.on('error', (err: Error) => reject(new Error(`Edge TTS error: ${err.message}`)));
    
    // Safety timeout: 30 seconds
    setTimeout(() => reject(new Error('Edge TTS timeout (30s)')), 30000);
  });
}
