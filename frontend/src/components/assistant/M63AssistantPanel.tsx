import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Send, Volume2, Pause, Play, RotateCcw, X, Sparkles, Maximize2, Minimize2, Square } from 'lucide-react';
import { AssistantResponse, AssistantLanguage } from '../../services/assistantService.js';

interface MessageItem {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  language?: AssistantLanguage;
  intent?: string;
  evidence?: Array<{ metric: string; value: string }>;
  rawTextByLang?: { en: string; ta: string; hi: string };
  audioDataUri?: string | null;
  timestamp: Date;
}

interface M63AssistantPanelProps {
  onClose: () => void;
  onQuery: (query: { text?: string; audioBlob?: Blob; browserTranscript?: string; language: AssistantLanguage; pageContext?: string }) => Promise<AssistantResponse>;
  pageContext?: string;
}

interface DictionaryContent {
  title: string;
  subtitle: string;
  welcomeMessage: string;
  verifiedEvidence: string;
  placeholder: string;
  listeningPlaceholder: string;
  thinkingStatus: string;
  micError: string;
  speaking: string;
  paused: string;
  stopBtn: string;
  audioUnavailable: string;
  contextSuggestions: {
    dashboard: string[];
    products: string[];
    orders: string[];
    analytics: string[];
  };
}

const UI_DICTIONARY: Record<AssistantLanguage, DictionaryContent> = {
  en: {
    title: 'M63 Assistant',
    subtitle: 'Verified Business Intelligence',
    welcomeMessage: 'Namaste! I am your M63 Business Assistant. Ask me about your sales, revenue, low stock items, or recent orders in English, தமிழ், or हिन्दी.',
    verifiedEvidence: 'VERIFIED EVIDENCE:',
    placeholder: 'Ask a business question...',
    listeningPlaceholder: 'Listening to voice input in your language...',
    thinkingStatus: '🧠 M63 is checking your verified business data...',
    micError: 'Microphone access unavailable. You can type your question instead.',
    speaking: 'Speaking response...',
    paused: 'Audio paused',
    stopBtn: 'Stop',
    audioUnavailable: 'Audio output unavailable',
    contextSuggestions: {
      dashboard: [
        'How are my sales this month?',
        'Which product sold the most?',
        'Which products are low in stock?',
        'Show my recent orders',
      ],
      products: [
        'How many active products do I have?',
        'Which products are low in stock?',
        'What is my best-selling creation?',
      ],
      orders: [
        'Show my recent orders',
        'How many pending orders do I have?',
        'What is my total sales revenue?',
      ],
      analytics: [
        'How much did I earn this month?',
        'Which category generated top revenue?',
        'Why did my sales change?',
      ],
    },
  },
  ta: {
    title: 'M63 வணிக உதவியாளர்',
    subtitle: 'சரிபார்க்கப்பட்ட வணிக நுண்ணறிவு',
    welcomeMessage: 'வணக்கம்! நான் உங்கள் M63 வணிக உதவியாளர். உங்கள் விற்பனை, வருவாய், குறைந்த இருப்பு பொருட்கள் அல்லது சமீபத்திய ஆர்டர்கள் பற்றி தமிழ், ஆங்கிலம் அல்லது ஹிந்தியில் கேட்கலாம்.',
    verifiedEvidence: 'சரிபார்க்கப்பட்ட சான்றுகள்:',
    placeholder: 'ஒரு வணிக கேள்வியைக் கேட்கவும்...',
    listeningPlaceholder: 'குரல் உள்ளீட்டைக் கேட்கிறது (தமிழ்)...',
    thinkingStatus: '🧠 M63 உங்கள் சரிபார்க்கப்பட்ட வணிக தரவை ஆய்வு செய்கிறது...',
    micError: 'மைக்ரோஃபோன் அணுகல் கிடைக்கவில்லை. உங்கள் கேள்வியை தட்டச்சு செய்யலாம்.',
    speaking: 'பதிலை பேசுகிறது...',
    paused: 'ஒலி நிறுத்தப்பட்டது',
    stopBtn: 'நிறுத்து',
    audioUnavailable: 'ஒலி வெளியீடு கிடைக்கவில்லை',
    contextSuggestions: {
      dashboard: [
        'இந்த மாதம் எனது விற்பனை எப்படி உள்ளது?',
        'எந்த தயாரிப்பு அதிகம் விற்பனையானது?',
        'எந்த பொருட்கள் இருப்பு குறைவாக உள்ளன?',
        'எனது சமீபத்திய ஆர்டர்களைக் காட்டு',
      ],
      products: [
        'என்னிடம் எத்தனை செயலில் உள்ள தயாரிப்புகள் உள்ளன?',
        'எந்த பொருட்கள் இருப்பு குறைவாக உள்ளன?',
        'எனது சிறந்த விற்பனை படைப்பு எது?',
      ],
      orders: [
        'எனது சமீபத்திய ஆர்டர்களைக் காட்டு',
        'என்னிடம் எத்தனை நிலுவையில் உள்ள ஆர்டர்கள் உள்ளன?',
        'எனது மொத்த விற்பனை வருவாய் என்ன?',
      ],
      analytics: [
        'இந்த மாதம் நான் எவ்வளவு சம்பாதித்தேன்?',
        'எந்த வகை அதிக வருவாயை ஈட்டியது?',
        'எனது விற்பனை ஏன் மாறியது?',
      ],
    },
  },
  hi: {
    title: 'M63 बिजनेस सहायक',
    subtitle: 'सत्यापित व्यापार इंटेलिजेंस',
    welcomeMessage: 'नमस्ते! मैं आपका M63 बिजनेस असिस्टेंट हूँ। अपनी बिक्री, राजस्व, कम स्टॉक वाली वस्तुओं या हाल के ऑर्डर के बारे में हिंदी, तमिल या अंग्रेजी में पूछें।',
    verifiedEvidence: 'सत्यापित साक्ष्य:',
    placeholder: 'एक व्यापार प्रश्न पूछें...',
    listeningPlaceholder: 'आवाज़ इनपुट सुन रहा है (हिंदी)...',
    thinkingStatus: '🧠 M63 आपके सत्यापित व्यापार डेटा की जांच कर रहा है...',
    micError: 'माइक्रोफ़ोन एक्सेस अनुपलब्ध है। आप अपना प्रश्न टाइप कर सकते हैं।',
    speaking: 'उत्तर बोल रहा है...',
    paused: 'ऑडियो रोका गया',
    stopBtn: 'रोकें',
    audioUnavailable: 'ऑडियो आउटपुट अनुपलब्ध',
    contextSuggestions: {
      dashboard: [
        'इस महीने मेरी बिक्री कैसी है?',
        'किस उत्पाद की सबसे अधिक बिक्री हुई?',
        'किन उत्पादों का स्टॉक कम है?',
        'मेरे हाल के ऑर्डर दिखाएं',
      ],
      products: [
        'मेरे पास कितने सक्रिय उत्पाद हैं?',
        'किन उत्पादों का स्टॉक कम है?',
        'मेरी सबसे ज्यादा बिकने वाली रचना कौन सी है?',
      ],
      orders: [
        'मेरे हाल के ऑर्डर दिखाएं',
        'मेरे पास कितने लंबित ऑर्डर हैं?',
        'मेरा कुल बिक्री राजस्व क्या है?',
      ],
      analytics: [
        'इस महीने मैंने कितना कमाया?',
        'किस श्रेणी ने शीर्ष राजस्व उत्पन्न किया?',
        'मेरी बिक्री क्यों बदली?',
      ],
    },
  },
};

const METRIC_TRANSLATIONS: Record<string, Record<AssistantLanguage, string>> = {
  'Total Revenue': { en: 'Total Revenue', ta: 'மொத்த வருவாய்', hi: 'कुल राजस्व' },
  'Completed Orders': { en: 'Completed Orders', ta: 'முடிவடைந்த ஆர்டர்கள்', hi: 'पूरे हुए ऑर्डर' },
  'Units Sold': { en: 'Units Sold', ta: 'விற்பனையான அலகுகள்', hi: 'बिकी हुई इकाइयां' },
  'Average Order Value': { en: 'Average Order Value', ta: 'சராசரி ஆர்டர் மதிப்பு', hi: 'औसत ऑर्डर मूल्य' },
  'Low Stock Count': { en: 'Low Stock Count', ta: 'குறைந்த இருப்பு எண்ணிக்கை', hi: 'कम स्टॉक संख्या' },
  'Total Products': { en: 'Total Products', ta: 'மொத்த தயாரிப்புகள்', hi: 'कुल उत्पाद' },
};

export const M63AssistantPanel: React.FC<M63AssistantPanelProps> = ({ onClose, onQuery, pageContext = 'dashboard' }) => {
  const [selectedLanguage, setSelectedLanguage] = useState<AssistantLanguage>('en');
  const [isFullScreen, setIsFullScreen] = useState(true);

  const [messages, setMessages] = useState<MessageItem[]>([
    {
      id: 'welcome',
      sender: 'assistant',
      text: UI_DICTIONARY['en'].welcomeMessage,
      language: 'en',
      rawTextByLang: {
        en: UI_DICTIONARY.en.welcomeMessage,
        ta: UI_DICTIONARY.ta.welcomeMessage,
        hi: UI_DICTIONARY.hi.welcomeMessage,
      },
      timestamp: new Date(),
    },
  ]);

  const [inputQuery, setInputQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [recording, setRecording] = useState(false);
  const [micError, setMicError] = useState<string | null>(null);

  // Audio Playback state
  const [audioState, setAudioState] = useState<'IDLE' | 'PLAYING' | 'PAUSED' | 'UNAVAILABLE'>('IDLE');
  const [currentAudioUri, setCurrentAudioUri] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const speechRecognitionRef = useRef<any>(null);
  const browserTranscriptRef = useRef<string>('');
  const chatBottomRef = useRef<HTMLDivElement>(null);

  const dict = UI_DICTIONARY[selectedLanguage] || UI_DICTIONARY.en;

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const getMetricLabel = (metric: string) => {
    return METRIC_TRANSLATIONS[metric]?.[selectedLanguage] || metric;
  };

  const getMessageDisplay = (msg: MessageItem): string => {
    if (msg.rawTextByLang && msg.rawTextByLang[selectedLanguage]) {
      return msg.rawTextByLang[selectedLanguage];
    }

    const t = msg.text;
    if (selectedLanguage === 'ta') {
      if (t.includes('in the mosam varumanam') || t.includes('varumanam')) {
        return 'இந்த மாதம் எனது வருவாய் எவ்வளவு?';
      }
      if (t.includes('revenue') || t.includes('orders') || t.includes('Namaste')) {
        return t
          .replace(/Namaste! For the past \d+ days, your total revenue is (₹[\d,]+) from (\d+) completed orders. You have (?:successfully )?sold (\d+) units with an average order value of (₹[\d,]+). Keep up the wonderful work!/gi,
            'வணக்கம்! கடந்த 30 நாட்களில், உங்களது மொத்த வருவாய் $2 முடிவடைந்த ஆர்டர்கள் மூலம் $1 ஆகும். நீங்கள் சராசரி ஆர்டர் மதிப்பு $4 உடன் $3 அலகுகளை வெற்றிகரமாக விற்பனை செய்துள்ளீர்கள். உங்களது சிறந்த பணியைத் தொடருங்கள்!')
          .replace(/Namaste!/gi, 'வணக்கம்!')
          .replace(/total revenue/gi, 'மொத்த வருவாய்')
          .replace(/completed orders/gi, 'முடிவடைந்த ஆர்டர்கள்')
          .replace(/units/gi, 'அலகுகள்')
          .replace(/average order value/gi, 'சராசரி ஆர்டர் மதிப்பு')
          .replace(/Keep up the wonderful work!/gi, 'உங்களது சிறந்த பணியைத் தொடருங்கள்!');
      }
    } else if (selectedLanguage === 'hi') {
      if (t.includes('in the mosam varumanam') || t.includes('varumanam')) {
        return 'इस महीने मेरी कमाई कितनी है?';
      }
      if (t.includes('revenue') || t.includes('orders') || t.includes('Namaste')) {
        return t
          .replace(/Namaste! For the past \d+ days, your total revenue is (₹[\d,]+) from (\d+) completed orders. You have (?:successfully )?sold (\d+) units with an average order value of (₹[\d,]+). Keep up the wonderful work!/gi,
            'नमस्ते! पिछले 30 दिनों में, आपका कुल राजस्व $2 पूरे हुए ऑर्डरों से $1 रहा है। आपने $4 के औसत ऑर्डर मूल्य के साथ $3 इकाइयां बेची हैं। बेहतरीन काम जारी रखें!')
          .replace(/Namaste!/gi, 'नमस्ते!')
          .replace(/total revenue/gi, 'कुल राजस्व')
          .replace(/completed orders/gi, 'पूरे हुए ऑर्डर')
          .replace(/units/gi, 'इकाइयां');
      }
    }

    return msg.text;
  };

  // Context-aware suggestions based on language & route
  const getContextSuggestions = () => {
    const key = (['products', 'new-product'].includes(pageContext)
      ? 'products'
      : pageContext === 'orders'
      ? 'orders'
      : pageContext === 'analytics'
      ? 'analytics'
      : 'dashboard') as keyof DictionaryContent['contextSuggestions'];

    return dict.contextSuggestions[key] || dict.contextSuggestions.dashboard;
  };

  // Phonetic transliterator fallback for OS speech engines lacking native Tamil/Hindi voice packs
  const getSpokenPhoneticText = (text: string, lang: AssistantLanguage): string => {
    if (lang === 'en') return text;

    let spoken = text.replace(/[*#_~`]/g, '');

    if (lang === 'ta') {
      spoken = spoken
        .replace(/₹/g, 'rupees ')
        .replace(/வணக்கம்!/g, 'Vanakkam! ')
        .replace(/கடந்த (\d+) நாட்களில்/g, 'Kadandha $1 naatgalil ')
        .replace(/உங்கள் வணிக விவரங்கள் இதோ:?/g, 'ungal vaniga vivarangal itho: ')
        .replace(/உங்கள் மொத்த வருவாய்/g, 'ungal motha varumaanam ')
        .replace(/மற்றும் முடிக்கப்பட்ட ஆர்டர்கள்/g, 'matrum mudikkappatta ordargal ')
        .replace(/ஆகும்\./g, 'aagum. ')
        .replace(/இந்த காலகட்டத்தில் மொத்தம்/g, 'indha kaalagattathil motham ')
        .replace(/பொருட்கள் விற்கப்பட்டுள்ளன,/g, 'porutgal virkappattullana, ')
        .replace(/மேலும் சராசரி ஆர்டர் மதிப்பு/g, 'maelum saraasari order madhippu ')
        .replace(/ஆக உள்ளது\./g, 'aaga ulladhu. ')
        .replace(/முடிவடைந்த ஆர்டர்கள் மூலம்/g, 'mudivadaintha ordargal moolam ')
        .replace(/நீங்கள்/g, 'neengal ')
        .replace(/உடன்/g, 'udan ')
        .replace(/அலகுகளை/g, 'alagugalai ')
        .replace(/வெற்றிகரமாக/g, 'vetrigaramaaga ')
        .replace(/விற்பனை செய்துள்ளீர்கள்/g, 'virpanai seidhulleergal ')
        .replace(/உங்களது சிறந்த பணியைத் தொடருங்கள்!/g, 'ungaladhu sirandha paniyai thodarungal! ');
    } else if (lang === 'hi') {
      spoken = spoken
        .replace(/₹/g, 'rupees ')
        .replace(/नमस्ते!/g, 'Namaste! ')
        .replace(/पिछले (\d+) दिनों में/g, 'Pichle $1 dinon mein ')
        .replace(/आपका कुल राजस्व/g, 'aapka kul raajashva ')
        .replace(/पूरे हुए ऑर्डरों से/g, 'poore hue orderon se ')
        .replace(/रहा है\./g, 'raha hai. ')
        .replace(/आपने/g, 'aapne ')
        .replace(/के औसत ऑर्डर मूल्य के साथ/g, 'ke ausat order moolya ke saath ')
        .replace(/इकाइयां बेची हैं\./g, 'ikaiyaan bechi hain. ')
        .replace(/बेहतरीन काम जारी रखें!/g, 'behtareen kaam jaari rakhein! ');
    }

    return spoken;
  };

  // Web Speech API Synthesis Engine with native script + phonetic fallback
  const speakWithWebSpeech = (text: string, lang: AssistantLanguage) => {
    if (!('speechSynthesis' in window)) {
      setAudioState('UNAVAILABLE');
      return;
    }

    try {
      window.speechSynthesis.resume();
      window.speechSynthesis.cancel();

      const langTag = lang === 'ta' ? 'ta-IN' : lang === 'hi' ? 'hi-IN' : 'en-IN';
      const voices = window.speechSynthesis.getVoices();
      const matchedVoice = voices.find(
        (v) => v.lang.replace('_', '-').toLowerCase().includes(langTag.toLowerCase())
      ) || voices.find((v) => v.lang.startsWith(lang));

      // If native Tamil/Hindi voice is present, speak Tamil/Hindi script directly; otherwise use phonetic Tamil text so OS speech engine reads every sentence
      const textToSpeak = matchedVoice
        ? text.replace(/[*#_~`]/g, '').replace(/₹/g, lang === 'ta' ? 'ரூபாய் ' : lang === 'hi' ? 'ரुपये ' : 'Rupees ')
        : getSpokenPhoneticText(text, lang);

      const utterance = new SpeechSynthesisUtterance(textToSpeak);
      utterance.lang = matchedVoice ? langTag : 'en-IN';
      utterance.rate = 0.88;
      utterance.pitch = 1.0;

      if (matchedVoice) utterance.voice = matchedVoice;

      utterance.onstart = () => setAudioState('PLAYING');
      utterance.onend = () => setAudioState('IDLE');
      utterance.onerror = () => setAudioState('UNAVAILABLE');

      window.speechSynthesis.speak(utterance);
    } catch (err) {
      setAudioState('UNAVAILABLE');
    }
  };

  // Audio Playback Controls
  const handlePlayAudio = (audioUri?: string | null, text?: string, lang: AssistantLanguage = selectedLanguage) => {
    // For Tamil and Hindi, ALWAYS use native WebSpeech API so every word in text is spoken completely
    if (lang === 'ta' || lang === 'hi' || !audioUri) {
      const textToSpeak = text || getMessageDisplay(messages[messages.length - 1]);
      if (textToSpeak) {
        speakWithWebSpeech(textToSpeak, lang);
      } else {
        setAudioState('UNAVAILABLE');
      }
      return;
    }

    if (audioRef.current) {
      audioRef.current.pause();
    }
    const audio = new Audio(audioUri);
    audioRef.current = audio;
    setCurrentAudioUri(audioUri);

    audio.onplay = () => setAudioState('PLAYING');
    audio.onended = () => setAudioState('IDLE');
    audio.onerror = () => {
      if (text) speakWithWebSpeech(text, lang);
      else setAudioState('UNAVAILABLE');
    };

    audio.play().catch(() => {
      if (text) speakWithWebSpeech(text, lang);
      else setAudioState('UNAVAILABLE');
    });
  };

  const handlePauseAudio = () => {
    if (audioRef.current && !audioRef.current.paused) {
      audioRef.current.pause();
      setAudioState('PAUSED');
    } else if ('speechSynthesis' in window && window.speechSynthesis.speaking) {
      window.speechSynthesis.pause();
      setAudioState('PAUSED');
    }
  };

  const handleResumeAudio = () => {
    if (audioRef.current && audioRef.current.paused) {
      audioRef.current.play();
      setAudioState('PLAYING');
    } else if ('speechSynthesis' in window && window.speechSynthesis.paused) {
      window.speechSynthesis.resume();
      setAudioState('PLAYING');
    }
  };

  const handleStopAudio = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setAudioState('IDLE');
  };

  // Submit Text Request
  const handleSendText = async (textToSend?: string) => {
    const query = (textToSend || inputQuery).trim();
    if (!query || loading) return;

    handleStopAudio();
    setInputQuery('');
    setMicError(null);

    const userMsg: MessageItem = {
      id: Date.now().toString(),
      sender: 'user',
      text: query,
      language: selectedLanguage,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setLoading(true);

    try {
      const response = await onQuery({ text: query, language: selectedLanguage, pageContext });

      const assistantMsg: MessageItem = {
        id: (Date.now() + 1).toString(),
        sender: 'assistant',
        text: response.textResponse,
        language: response.language || selectedLanguage,
        intent: response.intent,
        evidence: response.evidence,
        audioDataUri: response.audioDataUri,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMsg]);
      handlePlayAudio(response.audioDataUri, response.textResponse, response.language || selectedLanguage);
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          sender: 'assistant',
          text: err.message || 'Sorry, M63 Assistant is temporarily unable to answer.',
          language: selectedLanguage,
          timestamp: new Date(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  // Start Voice Recording with Web Speech STT fallback
  const startRecording = async () => {
    try {
      setMicError(null);
      browserTranscriptRef.current = '';

      // Initialize Web Speech Recognition concurrently
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        try {
          const recognition = new SpeechRecognition();
          recognition.lang = selectedLanguage === 'ta' ? 'ta-IN' : selectedLanguage === 'hi' ? 'hi-IN' : 'en-IN';
          recognition.interimResults = true;
          recognition.continuous = true;

          recognition.onresult = (event: any) => {
            const transcript = Array.from(event.results)
              .map((res: any) => res[0].transcript)
              .join('');
            if (transcript.trim()) {
              browserTranscriptRef.current = transcript.trim();
            }
          };
          recognition.start();
          speechRecognitionRef.current = recognition;
        } catch (e) {
          // Ignore WebSpeech recognition start errors
        }
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        stream.getTracks().forEach((track) => track.stop());
        setRecording(false);
        if (speechRecognitionRef.current) {
          try {
            speechRecognitionRef.current.stop();
          } catch (e) {}
        }
        handleSendVoice(audioBlob, browserTranscriptRef.current);
      };

      mediaRecorder.start();
      setRecording(true);
    } catch (err: any) {
      setMicError(dict.micError);
      setRecording(false);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && recording) {
      mediaRecorderRef.current.stop();
    }
  };

  const handleSendVoice = async (audioBlob: Blob, browserTranscript?: string) => {
    handleStopAudio();
    setLoading(true);

    const userText = browserTranscript || (selectedLanguage === 'ta' ? '🎤 [குரல் பதிவு]' : selectedLanguage === 'hi' ? '🎤 [आवाज़ रिकॉर्डिंग]' : '🎤 [Voice Recording]');

    const userMsg: MessageItem = {
      id: Date.now().toString(),
      sender: 'user',
      text: userText,
      language: selectedLanguage,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMsg]);

    try {
      const response = await onQuery({ audioBlob, browserTranscript, language: selectedLanguage, pageContext });

      const assistantMsg: MessageItem = {
        id: (Date.now() + 1).toString(),
        sender: 'assistant',
        text: response.textResponse,
        language: response.language || selectedLanguage,
        intent: response.intent,
        evidence: response.evidence,
        audioDataUri: response.audioDataUri,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMsg]);
      handlePlayAudio(response.audioDataUri, response.textResponse, response.language || selectedLanguage);
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          sender: 'assistant',
          text: err.message || "Sorry, I couldn't understand the audio. Please try again or type your question.",
          language: selectedLanguage,
          timestamp: new Date(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: isFullScreen ? '0' : 'auto 24px 85px auto',
        width: isFullScreen ? '100vw' : 'calc(100vw - 32px)',
        maxWidth: isFullScreen ? '100vw' : '460px',
        height: isFullScreen ? '100vh' : '620px',
        maxHeight: isFullScreen ? '100vh' : 'calc(100vh - 110px)',
        backgroundColor: 'rgba(9, 13, 22, 0.97)',
        backdropFilter: 'blur(24px)',
        borderRadius: isFullScreen ? '0px' : '24px',
        border: isFullScreen ? 'none' : '1px solid rgba(255, 255, 255, 0.12)',
        boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.9), 0 0 45px rgba(245, 158, 11, 0.2)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        zIndex: 99999,
        color: '#F8FAFC',
        transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
      }}
    >
      {/* Panel Header */}
      <div
        style={{
          padding: isFullScreen ? '18px 28px' : '14px 18px',
          backgroundColor: 'rgba(30, 41, 59, 0.8)',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div
            style={{
              width: isFullScreen ? '40px' : '34px',
              height: isFullScreen ? '40px' : '34px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #EA580C 0%, #C2410C 100%)',
              color: '#FFF',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 14px rgba(234, 88, 12, 0.4)',
            }}
          >
            <Sparkles size={isFullScreen ? 22 : 18} />
          </div>
          <div>
            <h3 style={{ fontSize: isFullScreen ? '1.15rem' : '0.98rem', fontWeight: 800, margin: 0, color: '#F8FAFC', letterSpacing: '-0.01em' }}>
              {dict.title}
            </h3>
            <span style={{ fontSize: isFullScreen ? '0.8rem' : '0.73rem', color: '#F59E0B', fontWeight: 600 }}>
              {dict.subtitle}
            </span>
          </div>
        </div>

        {/* Header Options: Language Selector Pills + Expand Toggle + Close Button */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              backgroundColor: 'rgba(15, 23, 42, 0.6)',
              padding: '3px',
              borderRadius: '10px',
              border: '1px solid rgba(255, 255, 255, 0.08)',
            }}
          >
            {(['en', 'ta', 'hi'] as AssistantLanguage[]).map((lang) => (
              <button
                key={lang}
                type="button"
                onClick={() => setSelectedLanguage(lang)}
                style={{
                  padding: isFullScreen ? '6px 14px' : '4px 10px',
                  borderRadius: '8px',
                  fontSize: isFullScreen ? '0.82rem' : '0.73rem',
                  fontWeight: 800,
                  border: 'none',
                  backgroundColor: selectedLanguage === lang ? '#F59E0B' : 'transparent',
                  color: selectedLanguage === lang ? '#0F172A' : '#94A3B8',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                }}
              >
                {lang === 'en' ? 'EN' : lang === 'ta' ? 'தமிழ்' : 'हिन्दी'}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => setIsFullScreen(!isFullScreen)}
            title={isFullScreen ? 'Minimize view' : 'Expand full screen'}
            style={{
              background: 'rgba(255, 255, 255, 0.06)',
              border: 'none',
              color: '#94A3B8',
              cursor: 'pointer',
              padding: '8px',
              borderRadius: '8px',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {isFullScreen ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
          </button>

          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'rgba(255, 255, 255, 0.06)',
              border: 'none',
              color: '#94A3B8',
              cursor: 'pointer',
              padding: '8px',
              borderRadius: '8px',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <X size={20} />
          </button>
        </div>
      </div>

      {/* Audio Playback Controls Banner */}
      {audioState !== 'IDLE' && (
        <div
          style={{
            padding: '10px 24px',
            backgroundColor: 'rgba(245, 158, 11, 0.15)',
            borderBottom: '1px solid rgba(245, 158, 11, 0.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '0.85rem',
            color: '#FDBA74',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600 }}>
            <Volume2 size={18} className="animate-pulse" />
            <span>
              {audioState === 'PLAYING'
                ? dict.speaking
                : audioState === 'PAUSED'
                ? dict.paused
                : dict.audioUnavailable}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {audioState === 'PLAYING' ? (
              <button type="button" onClick={handlePauseAudio} title="Pause Audio" style={{ background: 'none', border: 'none', color: '#FDBA74', cursor: 'pointer' }}>
                <Pause size={18} />
              </button>
            ) : (
              <button type="button" onClick={handleResumeAudio} title="Play Audio" style={{ background: 'none', border: 'none', color: '#FDBA74', cursor: 'pointer' }}>
                <Play size={18} />
              </button>
            )}

            <button
              type="button"
              onClick={() => handlePlayAudio(currentAudioUri, messages[messages.length - 1]?.text, selectedLanguage)}
              title="Replay Audio"
              style={{ background: 'none', border: 'none', color: '#FDBA74', cursor: 'pointer' }}
            >
              <RotateCcw size={18} />
            </button>

            {/* Clear Stop Button with text label */}
            <button
              type="button"
              onClick={handleStopAudio}
              title={dict.stopBtn}
              style={{
                backgroundColor: 'rgba(239, 68, 68, 0.2)',
                border: '1px solid rgba(239, 68, 68, 0.4)',
                borderRadius: '6px',
                color: '#FCA5A5',
                cursor: 'pointer',
                padding: '4px 8px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                fontSize: '0.75rem',
                fontWeight: 700,
              }}
            >
              <Square size={12} fill="currentColor" />
              <span>{dict.stopBtn}</span>
            </button>
          </div>
        </div>
      )}

      {/* Main Container Layout */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          width: '100%',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            flex: 1,
            width: '100%',
            maxWidth: isFullScreen ? '960px' : '100%',
            padding: isFullScreen ? '24px 32px' : '16px',
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
          }}
        >
          {messages.map((msg) => (
            <div
              key={msg.id}
              style={{
                alignSelf: msg.sender === 'user' ? 'flex-end' : 'flex-start',
                maxWidth: isFullScreen ? '82%' : '88%',
                padding: isFullScreen ? '16px 20px' : '12px 14px',
                borderRadius: msg.sender === 'user' ? '20px 20px 4px 20px' : '20px 20px 20px 4px',
                backgroundColor: msg.sender === 'user' ? '#EA580C' : 'rgba(30, 41, 59, 0.85)',
                color: '#F8FAFC',
                fontSize: isFullScreen ? '0.96rem' : '0.88rem',
                lineHeight: 1.6,
                border: msg.sender === 'assistant' ? '1px solid rgba(255, 255, 255, 0.1)' : 'none',
                boxShadow: msg.sender === 'user' ? '0 4px 15px rgba(234, 88, 12, 0.3)' : '0 4px 15px rgba(0, 0, 0, 0.3)',
              }}
            >
              <div style={{ whiteSpace: 'pre-wrap' }}>{getMessageDisplay(msg)}</div>

              {/* Evidence Data Cards */}
              {msg.evidence && msg.evidence.length > 0 && (
                <div style={{ marginTop: '12px', paddingTop: '10px', borderTop: '1px solid rgba(255, 255, 255, 0.12)' }}>
                  <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#F59E0B', letterSpacing: '0.05em' }}>
                    {dict.verifiedEvidence}
                  </span>
                  <div
                    style={{
                      marginTop: '8px',
                      display: 'grid',
                      gridTemplateColumns: isFullScreen ? 'repeat(auto-fit, minmax(180px, 1fr))' : '1fr',
                      gap: '8px',
                    }}
                  >
                    {msg.evidence.map((ev, i) => (
                      <div
                        key={i}
                        style={{
                          backgroundColor: 'rgba(15, 23, 42, 0.6)',
                          padding: '8px 12px',
                          borderRadius: '8px',
                          border: '1px solid rgba(245, 158, 11, 0.2)',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '2px',
                        }}
                      >
                        <span style={{ fontSize: '0.72rem', color: '#94A3B8' }}>{getMetricLabel(ev.metric)}</span>
                        <strong style={{ fontSize: '0.9rem', color: '#F8FAFC', fontWeight: 700 }}>{ev.value}</strong>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}

          {loading && (
            <div
              style={{
                alignSelf: 'flex-start',
                padding: '12px 18px',
                borderRadius: '14px',
                backgroundColor: 'rgba(30, 41, 59, 0.85)',
                border: '1px solid rgba(245, 158, 11, 0.3)',
                fontSize: '0.9rem',
                color: '#FDBA74',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <span>{dict.thinkingStatus}</span>
            </div>
          )}

          <div ref={chatBottomRef} />
        </div>

        {/* Suggested Context Questions */}
        <div
          style={{
            width: '100%',
            maxWidth: isFullScreen ? '960px' : '100%',
            padding: isFullScreen ? '12px 32px' : '8px 14px',
            backgroundColor: 'transparent',
            display: 'flex',
            gap: '8px',
            overflowX: 'auto',
            justifyContent: isFullScreen ? 'center' : 'flex-start',
            flexWrap: isFullScreen ? 'wrap' : 'nowrap',
          }}
        >
          {getContextSuggestions().map((prompt, i) => (
            <button
              key={i}
              type="button"
              onClick={() => handleSendText(prompt)}
              style={{
                whiteSpace: 'nowrap',
                padding: isFullScreen ? '8px 16px' : '6px 12px',
                borderRadius: '20px',
                backgroundColor: 'rgba(245, 158, 11, 0.12)',
                border: '1px solid rgba(245, 158, 11, 0.35)',
                color: '#FDBA74',
                fontSize: isFullScreen ? '0.82rem' : '0.75rem',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
            >
              {prompt}
            </button>
          ))}
        </div>

        {micError && (
          <div
            style={{
              width: '100%',
              maxWidth: isFullScreen ? '960px' : '100%',
              padding: '8px 24px',
              backgroundColor: 'rgba(239, 68, 68, 0.2)',
              color: '#FCA5A5',
              fontSize: '0.8rem',
              textAlign: 'center',
            }}
          >
            {micError}
          </div>
        )}

        {/* Input Controls Footer */}
        <div
          style={{
            width: '100%',
            backgroundColor: '#0F172A',
            borderTop: '1px solid rgba(255, 255, 255, 0.08)',
            display: 'flex',
            justifyContent: 'center',
            padding: isFullScreen ? '20px 32px' : '12px 14px',
          }}
        >
          <div
            style={{
              width: '100%',
              maxWidth: isFullScreen ? '960px' : '100%',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
            }}
          >
            <input
              type="text"
              placeholder={recording ? dict.listeningPlaceholder : dict.placeholder}
              value={inputQuery}
              onChange={(e) => setInputQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSendText()}
              disabled={loading || recording}
              style={{
                flex: 1,
                padding: isFullScreen ? '14px 18px' : '10px 14px',
                borderRadius: '14px',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                backgroundColor: 'rgba(30, 41, 59, 0.8)',
                color: '#F8FAFC',
                fontSize: isFullScreen ? '0.96rem' : '0.88rem',
                outline: 'none',
              }}
            />

            {/* Microphone Voice Toggle */}
            <button
              type="button"
              onClick={recording ? stopRecording : startRecording}
              style={{
                width: isFullScreen ? '48px' : '40px',
                height: isFullScreen ? '48px' : '40px',
                borderRadius: '14px',
                border: 'none',
                backgroundColor: recording ? '#EF4444' : 'rgba(245, 158, 11, 0.2)',
                color: recording ? '#FFF' : '#F59E0B',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                boxShadow: recording ? '0 0 15px rgba(239, 68, 68, 0.5)' : 'none',
              }}
            >
              {recording ? <MicOff size={isFullScreen ? 22 : 18} /> : <Mic size={isFullScreen ? 22 : 18} />}
            </button>

            {/* Send Button */}
            <button
              type="button"
              onClick={() => handleSendText()}
              disabled={!inputQuery.trim() || loading || recording}
              style={{
                width: isFullScreen ? '48px' : '40px',
                height: isFullScreen ? '48px' : '40px',
                borderRadius: '14px',
                border: 'none',
                backgroundColor: '#EA580C',
                color: '#FFF',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: inputQuery.trim() && !loading ? 'pointer' : 'not-allowed',
                opacity: inputQuery.trim() && !loading ? 1 : 0.5,
                boxShadow: inputQuery.trim() && !loading ? '0 4px 14px rgba(234, 88, 12, 0.4)' : 'none',
              }}
            >
              <Send size={isFullScreen ? 22 : 18} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
