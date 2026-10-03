// Web Speech API interface for J.A.R.V.I.S. voice synthesis and recognition

export type SpeechStateListener = (isSpeaking: boolean) => void;
export type ListeningStateListener = (isListening: boolean) => void;

class SpeechService {
  private synth: SpeechSynthesis | null = null;
  private recognition: any = null;
  public isSpeechSupported: boolean = false;
  public isRecognitionSupported: boolean = false;
  public voiceEnabled: boolean = true;

  private speechListeners: SpeechStateListener[] = [];
  private listeningListeners: ListeningStateListener[] = [];

  constructor() {
    if (typeof window !== 'undefined') {
      if ('speechSynthesis' in window) {
        this.synth = window.speechSynthesis;
        this.isSpeechSupported = true;
      }

      const SpeechRecognition =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        this.recognition = new SpeechRecognition();
        this.recognition.continuous = false;
        this.recognition.interimResults = false;
        this.recognition.lang = 'en-US';
        this.isRecognitionSupported = true;
      }
    }
  }

  // Register listeners for speech activity (to power UI audio waveform)
  subscribeSpeaking(fn: SpeechStateListener) {
    this.speechListeners.push(fn);
    return () => {
      this.speechListeners = this.speechListeners.filter((l) => l !== fn);
    };
  }

  subscribeListening(fn: ListeningStateListener) {
    this.listeningListeners.push(fn);
    return () => {
      this.listeningListeners = this.listeningListeners.filter((l) => l !== fn);
    };
  }

  private setSpeaking(state: boolean) {
    this.speechListeners.forEach((fn) => fn(state));
  }

  private setListening(state: boolean) {
    this.listeningListeners.forEach((fn) => fn(state));
  }

  // Pick the best voice resembling J.A.R.V.I.S. (preferring British English male/natural)
  private getJarvisVoice(): SpeechSynthesisVoice | null {
    if (!this.synth) return null;
    const voices = this.synth.getVoices();
    if (!voices || voices.length === 0) return null;

    // Prefer British English voices (en-GB)
    const britishVoices = voices.filter(
      (v) => v.lang.startsWith('en-GB') || v.lang.startsWith('en_GB')
    );
    const maleBritish = britishVoices.find(
      (v) =>
        v.name.toLowerCase().includes('male') ||
        v.name.toLowerCase().includes('george') ||
        v.name.toLowerCase().includes('daniel') ||
        v.name.toLowerCase().includes('oliver')
    );
    if (maleBritish) return maleBritish;
    if (britishVoices.length > 0) return britishVoices[0];

    // Fallback to en-US or en-IE/en-AU
    const englishVoices = voices.filter((v) => v.lang.startsWith('en'));
    const maleEnglish = englishVoices.find(
      (v) =>
        v.name.toLowerCase().includes('natural') ||
        v.name.toLowerCase().includes('male') ||
        v.name.toLowerCase().includes('david')
    );
    return maleEnglish || englishVoices[0] || voices[0];
  }

  // Speak text with authentic Jarvis calm cadence
  speak(text: string, onEndCallback?: () => void) {
    if (!this.synth || !this.voiceEnabled) {
      if (onEndCallback) onEndCallback();
      return;
    }

    try {
      this.synth.cancel(); // Stop prior speech if overlapping

      // Strip markdown asterisks or special characters for speech
      const cleanText = text.replace(/[*_#`[\]]/g, ' ').replace(/\s+/g, ' ').trim();
      const utterance = new SpeechSynthesisUtterance(cleanText);

      const voice = this.getJarvisVoice();
      if (voice) {
        utterance.voice = voice;
      }

      // Slightly lower pitch & deliberate measured pace characteristic of Paul Bettany's Jarvis
      utterance.rate = 0.95;
      utterance.pitch = 0.92;

      utterance.onstart = () => {
        this.setSpeaking(true);
      };

      utterance.onend = () => {
        this.setSpeaking(false);
        if (onEndCallback) onEndCallback();
      };

      utterance.onerror = (e) => {
        console.warn('Speech synthesis notice', e);
        this.setSpeaking(false);
        if (onEndCallback) onEndCallback();
      };

      this.synth.speak(utterance);
    } catch (e) {
      console.warn('Speech error', e);
      this.setSpeaking(false);
      if (onEndCallback) onEndCallback();
    }
  }

  stopSpeaking() {
    if (this.synth) {
      this.synth.cancel();
      this.setSpeaking(false);
    }
  }

  // Start listening via microphone
  startListening(
    onResult: (transcript: string) => void,
    onError?: (err: string) => void
  ) {
    if (!this.recognition) {
      if (onError) onError('Speech recognition is not supported in this browser.');
      return;
    }

    try {
      this.recognition.abort();

      this.recognition.onstart = () => {
        this.setListening(true);
      };

      this.recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        this.setListening(false);
        onResult(transcript);
      };

      this.recognition.onerror = (event: any) => {
        this.setListening(false);
        if (onError) onError(event.error || 'Voice input error');
      };

      this.recognition.onend = () => {
        this.setListening(false);
      };

      this.recognition.start();
    } catch (err: any) {
      this.setListening(false);
      if (onError) onError(err.message || 'Microphone activation failed');
    }
  }

  stopListening() {
    if (this.recognition) {
      try {
        this.recognition.stop();
      } catch {
        // Ignore
      }
      this.setListening(false);
    }
  }
}

export const speechService = new SpeechService();
