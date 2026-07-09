// Voice Provider Stub for Sarvam AI / Native Web Speech API fallback

export async function transcribeAudio(audioBlobUrl: string): Promise<string> {
  // Mock transcript - in real app, sends to Sarvam API
  return "Simulated speech transcript";
}

export function synthesizeSpeech(text: string, language: "en" | "mr" = "en"): Promise<void> {
  return new Promise((resolve) => {
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.cancel(); // Stop any current speech
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = language === "mr" ? "mr-IN" : "en-IN";
      
      // Try to find a matching voice
      const voices = window.speechSynthesis.getVoices();
      const voice = voices.find(v => v.lang.startsWith(language === "mr" ? "mr" : "en"));
      if (voice) {
        utterance.voice = voice;
      }

      utterance.onend = () => resolve();
      utterance.onerror = () => resolve();
      window.speechSynthesis.speak(utterance);
    } else {
      console.log(`TTS [${language}]: ${text}`);
      resolve();
    }
  });
}

// Interactive Browser Speech Recognition helper
export function startContinuousListening(
  onResult: (text: string) => void,
  onError: (err: string) => void,
  language: "en" | "mr" = "en"
): { stop: () => void } {
  if (typeof window !== "undefined") {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = language === "mr" ? "mr-IN" : "en-US";

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        onResult(transcript);
      };

      recognition.onerror = (event: any) => {
        onError(event.error);
      };

      recognition.start();
      return {
        stop: () => {
          try {
            recognition.stop();
          } catch(e) {}
        }
      };
    }
  }

  // Fallback if not supported
  console.warn("SpeechRecognition not supported in this environment");
  return { stop: () => {} };
}
