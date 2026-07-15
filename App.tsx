import React, { useState, useEffect, useRef } from 'react';
import { StatusBar } from 'expo-status-bar';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Modal,
  Image,
  SafeAreaView,
  Pressable,
  Platform,
  Alert,
} from 'react-native';
import * as db from './services/db';
import { processVoiceInput } from './services/gemini';
import { startContinuousListening, synthesizeSpeech } from './services/voice';
import { Theme } from './styles/theme';
import {
  Menu as MenuIcon,
  Phone,
  X,
  Plus,
  Mic,
  Send,
  Home as HomeIcon,
  BookOpen,
  CheckSquare,
  Settings as SettingsIcon,
  Folder,
  MessageSquare,
  History,
  Info,
  PlusCircle,
} from 'lucide-react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
} from 'react-native-reanimated';

// Translation dictionary
const TRANSLATIONS = {
  en: {
    appTitle: "Logit AI",
    syncStatus: "Saved — will sync when online",
    onboardingTitle: "Welcome to Logit AI",
    selectLang: "Choose Language / भाषा निवडा",
    selectRole: "Select Role / भूमिका निवडा",
    adminRole: "Admin (Mother / Founder)",
    normalRole: "Normal (Father)",
    startBtn: "Get Started",
    tabHome: "Home",
    tabLedger: "Ledger",
    tabApprovals: "Approvals",
    tabSettings: "Settings",
    micTapToSpeak: "Tap microphone to record...",
    micListening: "Listening... speak now",
    micProcessing: "Processing your voice...",
    voiceCommandPlaceholder: "Type voice command here (or use mic)...",
    sendBtn: "Send",
    callBtn: "Start On-Demand Call 📞",
    quickNoteTitle: "Quick Voice Note",
    ledgerTitle: "Business Ledger",
    noEntries: "No entries recorded for this date.",
    approvalsTitle: "Pending Approvals",
    noApprovals: "No pending entries for review.",
    settingsTitle: "Device Settings",
    toggleLanguage: "Toggle Language",
    toggleRole: "Toggle Device Role",
    shopListTitle: "Shops Manager",
    itemListTitle: "Items Manager",
    addShop: "Add New Shop",
    addItem: "Add New Item",
    placeholderShopName: "Shop Name",
    placeholderItemName: "Item Name",
    outstandingBalance: "Outstanding Balance",
    editEntryTitle: "Edit Ledger Entry",
    saveBtn: "Save",
    cancelBtn: "Cancel",
    confirmApprove: "Approve",
    confirmReject: "Reject",
    statusPending: "Pending Approval",
    statusConfirmed: "Confirmed",
    totalBill: "Total Bill",
    invoiceGenerated: "Invoice Shared",
    generateInvoiceBtn: "Generate Invoice",
    lockLedgerBtn: "Lock & Finalize",
    lockedLabel: "Locked",
    roleLabel: "Role",
    langLabel: "Language",
    resetData: "Reset All Database",
    
    // Phase 4 Call translation keys
    incomingCall: "Incoming Call...",
    morningCallTitle: "Morning Purchase Call",
    nightCallTitle: "Night Pricing Call",
    onDemandCallTitle: "On-demand Assistant Call",
    acceptBtn: "Accept ✅",
    declineBtn: "Decline ❌",
    endCallBtn: "End Call 🔴",
    simTimeLabel: "Simulated Clock",
    timeWarp15: "+15 Min ⏩",
    timeWarp30: "+30 Min ⏩",
    triggerMorningCall: "Trigger 10:00 AM Call ⏰",
    triggerNightCall: "Trigger 9:00 PM Call ⏰",
    retryBanner: "Scheduled retry in",
    minutes: "minutes",
    missedCallAlert: "Missed Call from Logit Assistant",
    callDoneBtn: "Say 'Done' / संपले",
    callYesBtn: "Say 'Yes' / होय",
  },
  mr: {
    appTitle: "लॉगीट एआय",
    syncStatus: "सुरक्षित — ऑनलाइन आल्यावर सिंक होईल",
    onboardingTitle: "लॉगीट एआय मध्ये आपले स्वागत आहे",
    selectLang: "Choose Language / भाषा निवडा",
    selectRole: "Select Role / भूमिका निवडा",
    adminRole: "अ‍ॅडमीन (आई / मालक)",
    normalRole: "नॉर्मल (बाबा / चालक)",
    startBtn: "सुरू करा",
    tabHome: "मुख्य",
    tabLedger: "लेजर पत्रक",
    tabApprovals: "मंजुरी",
    tabSettings: "सेटिंग्ज",
    micTapToSpeak: "नोंदवण्यासाठी माइक दाबा...",
    micListening: "ऐकत आहे... आता बोला",
    micProcessing: "तुमचा आवाज समजून घेत आहे...",
    voiceCommandPlaceholder: "व्हॉइस कमांड टाईप करा (किंवा माइक वापरा)...",
    sendBtn: "पाठवा",
    callBtn: "कॉल सुरू करा 📞",
    quickNoteTitle: "क्लिक व्हॉइस नोट",
    ledgerTitle: "व्यवसाय लेजर",
    noEntries: "या तारखेसाठी कोणतीही नोंद आढळली नाही.",
    approvalsTitle: "मंजुरीसाठी प्रलंबित",
    noApprovals: "पुनरावलोकनासाठी कोणतीही नोंद नाही.",
    settingsTitle: "डिव्हाइस सेटिंग्ज",
    toggleLanguage: "भाषा बदला",
    toggleRole: "भूमिका बदला",
    shopListTitle: "दुकाने व्यवस्थापक",
    itemListTitle: "वस्तू व्यवस्थापक",
    addShop: "नवीन दुकान जोडा",
    addItem: "नवीन वस्तू जोडा",
    placeholderShopName: "दुकानाचे नाव",
    placeholderItemName: "वस्तूचे नाव",
    outstandingBalance: "बाकी रक्कम",
    editEntryTitle: "नोंद दुरुस्त करा",
    saveBtn: "जतन करा",
    cancelBtn: "रद्द करा",
    confirmApprove: "मंजूर करा",
    confirmReject: "नाकारा",
    statusPending: "मंजुरी प्रलंबित",
    statusConfirmed: "निश्चित",
    totalBill: "एकूण बिल",
    invoiceGenerated: "इनव्हॉइस शेअर केले",
    generateInvoiceBtn: "बिल तयार करा",
    lockLedgerBtn: "लॉक आणि फायनल करा",
    lockedLabel: "लॉक केलेले",
    roleLabel: "भूमिका",
    langLabel: "भाषा",
    resetData: "सर्व डेटा डिलीट करा",

    // Phase 4 Call translation keys
    incomingCall: "इनकमिंग कॉल...",
    morningCallTitle: "सकाळची खरेदी नोंदणी",
    nightCallTitle: "रात्रीची दर नोंदणी",
    onDemandCallTitle: "असिस्टंट कॉल",
    acceptBtn: "स्वीकारा ✅",
    declineBtn: "नाकारा ❌",
    endCallBtn: "कॉल संपवा 🔴",
    simTimeLabel: "सिम्युलेटेड घड्याळ",
    timeWarp15: "+१५ मिनिटे ⏩",
    timeWarp30: "+३० मिनिटे ⏩",
    triggerMorningCall: "सकाळी १०:०० कॉल सुरू करा ⏰",
    triggerNightCall: "रात्री ९:०० कॉल सुरू करा ⏰",
    retryBanner: "पुन्हा कॉल नियोजित आहे",
    minutes: "मिनिटांत",
    missedCallAlert: "लॉगीट असिस्टंटकडून मिस्ड कॉल",
    callDoneBtn: "Say 'Done' / संपले",
    callYesBtn: "Say 'Yes' / होय",
  }
};

interface CallSession {
  type: "morning" | "night" | "on_demand";
  status: "ringing" | "active" | "ended" | "missed";
  duration: number; // seconds
  callerName: string;
  aiUtterance: string;
  userSpeech: string;
  // State Machine pointers for interactive scripts
  stepIndex: number;
  shopIndex: number;
  itemIndex: number;
  tempPurchases: { itemName: string; quantity: number; pricePaid: number }[];
  tempPrices: { shopName: string; itemName: string; price: number }[];
}

interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
}

export default function App() {
  // Onboarding Settings
  const [hasOnboarded, setHasOnboarded] = useState(false);
  const [language, setLanguage] = useState<'en' | 'mr'>('en');
  const [role, setRole] = useState<'admin' | 'normal'>('admin');

  // Navigation
  const [currentTab, setCurrentTab] = useState<'home' | 'ledger' | 'approvals' | 'settings'>('home');
  const [selectedShopId, setSelectedShopId] = useState<string | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const scrollViewRef = useRef<ScrollView>(null);

  // Input states
  const [textCommand, setTextCommand] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [aiSpeechOutput, setAiSpeechOutput] = useState('');
  const [recognizedText, setRecognizedText] = useState('');

  // Selected date for ledger
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

  // Editing Entry Modal
  const [editModalVisible, setEditModalVisible] = useState(false);
  // Invoice sharing states
  const [invoiceModalVisible, setInvoiceModalVisible] = useState(false);
  const [invoiceImageUrl, setInvoiceImageUrl] = useState<string | null>(null);
  const [sharingShopName, setSharingShopName] = useState('');
  const [sharingDate, setSharingDate] = useState('');
  const [editingEntry, setEditingEntry] = useState<{
    shopId: string;
    date: string;
    itemId: string;
    itemName: string;
    quantity: number;
    unitPrice: number | null;
  } | null>(null);

  // Loaded database lists
  const [shops, setShops] = useState<db.Shop[]>([]);
  const [items, setItems] = useState<db.CanonicalItem[]>([]);
  const [pendingApprovals, setPendingApprovals] = useState<db.PendingApproval[]>([]);

  // --- Phase 4: Simulated Scheduler & Call Mode State ---
  const [simulatedHour, setSimulatedHour] = useState(9); // starts at 9:00 AM
  const [simulatedMinute, setSimulatedMinute] = useState(45); // 9:45 AM
  const [activeCall, setActiveCall] = useState<CallSession | null>(null);
  
  // Retry timers (in minutes relative to simulated clock)
  const [retryCallType, setRetryCallType] = useState<"morning" | "night" | null>(null);
  const [retryTimeRemaining, setRetryTimeRemaining] = useState<number | null>(null); // in simulated minutes

  // Active call duration timer reference
  const callTimerRef = useRef<any>(null);
  const ringingTimeoutRef = useRef<any>(null);
  const recognitionRef = useRef<any>(null);
  const [callIsListening, setCallIsListening] = useState<boolean>(false);
  const isCallLoopActiveRef = useRef<boolean>(false);
  const callListeningSessionRef = useRef<any>(null);
  const activeCallRef = useRef<CallSession | null>(null);

  useEffect(() => {
    activeCallRef.current = activeCall;
  }, [activeCall]);

  // --- Side Drawer States & Reanimated Animations ---
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const drawerTranslateX = useSharedValue(-300);
  const backdropOpacity = useSharedValue(0);

  useEffect(() => {
    if (isDrawerOpen) {
      drawerTranslateX.value = withTiming(0, { duration: 250 });
      backdropOpacity.value = withTiming(0.6, { duration: 250 });
    } else {
      drawerTranslateX.value = withTiming(-300, { duration: 200 });
      backdropOpacity.value = withTiming(0, { duration: 200 });
    }
  }, [isDrawerOpen]);

  const animatedDrawerStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateX: drawerTranslateX.value }],
    };
  });

  const animatedBackdropStyle = useAnimatedStyle(() => {
    return {
      opacity: backdropOpacity.value,
    };
  });

  const handleCloseDrawer = () => {
    drawerTranslateX.value = withTiming(-300, { duration: 200 });
    backdropOpacity.value = withTiming(0, { duration: 200 });
    setTimeout(() => {
      setIsDrawerOpen(false);
    }, 200);
  };

  const handleNavPress = (tabName: 'home' | 'ledger' | 'approvals' | 'settings') => {
    handleCloseDrawer();
    setTimeout(() => {
      setCurrentTab(tabName);
      refreshData();
    }, 200);
  };

  // Load database on start
  useEffect(() => {
    db.loadDatabase();
    refreshData();
    
    // Load onboarded settings
    if (typeof window !== 'undefined' && window.localStorage) {
      const onboarded = window.localStorage.getItem('logit_onboarded');
      const lang = window.localStorage.getItem('logit_lang');
      const r = window.localStorage.getItem('logit_role');
      if (onboarded === 'true') {
        setHasOnboarded(true);
      }
      if (lang === 'en' || lang === 'mr') {
        setLanguage(lang);
      }
      if (r === 'admin' || r === 'normal') {
        setRole(r);
      }
    }
  }, []);

  // --- Chat Screen Effects ---
  useEffect(() => {
    setChatMessages([
      {
        id: 'welcome',
        sender: 'assistant',
        text: language === 'mr' 
          ? 'नमस्कार! मी तुम्हाला आज कशी मदत करू? तुम्ही खरेदी किंवा व्यवहारांची नोंद येथे करू शकता.'
          : 'Hello! How can I help you today? You can log purchases or store ledger transactions here.',
      }
    ]);
  }, [language]);

  useEffect(() => {
    if (scrollViewRef.current) {
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [chatMessages.length, isProcessing]);

  const refreshData = () => {
    setShops(db.getShops());
    setItems(db.getItems());
    setPendingApprovals(db.getPendingApprovals());
  };

  const handleStartOnboarding = () => {
    setHasOnboarded(true);
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem('logit_onboarded', 'true');
      window.localStorage.setItem('logit_lang', language);
      window.localStorage.setItem('logit_role', role);
    }
  };

  const handleToggleLanguage = () => {
    const nextLang = language === 'en' ? 'mr' : 'en';
    setLanguage(nextLang);
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem('logit_lang', nextLang);
    }
  };

  const handleToggleRole = () => {
    const nextRole = role === 'admin' ? 'normal' : 'admin';
    setRole(nextRole);
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem('logit_role', nextRole);
    }
  };

  // Quick Voice Note mic handler
  // Quick Voice Note mic handler
  const handleMicPress = () => {
    if (isListening) {
      console.log("[UI] Mic tapped again. Stopping recording manually...");
      setIsListening(false);
      if (recognitionRef.current) {
        recognitionRef.current.stop();
        recognitionRef.current = null;
      }
      return;
    }

    console.log("[UI] Mic tapped. Starting recording...");
    setRecognizedText('');
    setIsListening(true);

    const recognition = startContinuousListening(
      async (resultText) => {
        console.log("[UI] STT transcription callback received result:", JSON.stringify(resultText));
        setIsListening(false);
        setRecognizedText(resultText);
        await submitTextInput(resultText);
      },
      (errorMsg) => {
        setIsListening(false);
        console.error("[UI] Speech Error callback: ", errorMsg);
      },
      language
    );

    recognitionRef.current = recognition;
  };

  const submitTextInput = async (inputStr: string) => {
    if (!inputStr.trim()) return;
    setIsProcessing(true);
    setAiSpeechOutput('');
    console.log("[Gemini API] submitTextInput. Triggering Gemini NLP for text:", JSON.stringify(inputStr));

    // Append User Message
    const userMsg: ChatMessage = {
      id: String(Date.now()),
      sender: 'user',
      text: inputStr.trim()
    };
    setChatMessages(prev => [...prev, userMsg]);

    try {
      const result = await processVoiceInput(inputStr, role, language);
      setAiSpeechOutput(result.responseText);
      
      // Append Assistant Message
      const assistantMsg: ChatMessage = {
        id: String(Date.now() + 1),
        sender: 'assistant',
        text: result.responseText
      };
      setChatMessages(prev => [...prev, assistantMsg]);

      synthesizeSpeech(result.responseText, language);
      refreshData();
    } catch (e) {
      console.error(e);
      // Append error notification
      const errorMsg: ChatMessage = {
        id: String(Date.now() + 2),
        sender: 'assistant',
        text: language === 'mr' ? 'क्षमस्व, विनंतीवर प्रक्रिया करताना त्रुटी आली.' : 'Sorry, an error occurred processing your request.'
      };
      setChatMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsProcessing(false);
      setTextCommand('');
    }
  };

  // --- Phase 4 Call Mode State Machine Scripts ---

  // Helper to format simulated clock display
  const getFormattedSimTime = () => {
    const hh = simulatedHour.toString().padStart(2, '0');
    const mm = simulatedMinute.toString().padStart(2, '0');
    const period = simulatedHour >= 12 ? "PM" : "AM";
    const displayHour = simulatedHour > 12 ? simulatedHour - 12 : simulatedHour === 0 ? 12 : simulatedHour;
    return `${displayHour.toString().padStart(2, '0')}:${mm} ${period}`;
  };

  // Start Ringing state
  const initiateRinging = (type: "morning" | "night" | "on_demand") => {
    if (activeCall) return;

    let callerName = "";
    let initialGreeting = "";

    if (type === "morning") {
      callerName = TRANSLATIONS[language].morningCallTitle;
      initialGreeting = language === "mr" 
        ? "नमस्कार! आजची सकाळची खरेदी नोंदवूया. तुम्ही आज काय खरेदी केले?" 
        : "Hello! Let's log today's morning purchases. What did you buy?";
    } else if (type === "night") {
      callerName = TRANSLATIONS[language].nightCallTitle;
      
      // Look up what needs pricing today
      const unpriced = db.getUnpricedItems(selectedDate);
      const hasUnpriced = Object.keys(unpriced).length > 0;

      if (!hasUnpriced) {
        initialGreeting = language === "mr" 
          ? "नमस्कार! आजच्या सर्व डिलिव्हरीची किंमत आधीच सेट केली आहे. आज रात्रीचे कोणतेही बिल प्रलंबित नाही. शुभ रात्री!" 
          : "Hello! All deliveries for today are already priced. There are no pending bills tonight. Good night!";
      } else {
        // Collect first shop item
        const firstShop = Object.keys(unpriced)[0];
        const firstItem = unpriced[firstShop][0];
        initialGreeting = language === "mr" 
          ? `नमस्कार! चला आजचे दर सेट करूया. ${firstShop} साठी, आपण ${firstItem} पोहोचवले आहे. त्याची काय किंमत ठरली?` 
          : `Hello! Let's set prices for today's deliveries. For ${firstShop}, we delivered ${firstItem}. What is the price?`;
      }
    } else {
      callerName = TRANSLATIONS[language].onDemandCallTitle;
      initialGreeting = language === "mr"
        ? "हो, बोला! मी ऐकत आहे. काय नोंदवू?"
        : "Yes, I am listening. What would you like to log?";
    }

    const session: CallSession = {
      type,
      status: "ringing",
      duration: 0,
      callerName,
      aiUtterance: initialGreeting,
      userSpeech: "",
      stepIndex: 0,
      shopIndex: 0,
      itemIndex: 0,
      tempPurchases: [],
      tempPrices: []
    };

    setActiveCall(session);

    // Unanswered call timeout: if ringing is ignored for 15 seconds, trigger missed call
    ringingTimeoutRef.current = setTimeout(() => {
      handleMissedCall(type);
    }, 15000);
  };

  // Ringing declined -> retry in 30 minutes
  const handleDeclineCall = () => {
    if (!activeCall) return;
    
    const callType = activeCall.type;
    
    // Clear ringing timeout
    if (ringingTimeoutRef.current) clearTimeout(ringingTimeoutRef.current);

    setActiveCall(null);

    if (callType !== "on_demand") {
      setRetryCallType(callType);
      setRetryTimeRemaining(30); // 30 minutes retry for declined
    }
  };

  // Ringing unanswered -> retry in 15 minutes
  const handleMissedCall = (type: "morning" | "night" | "on_demand") => {
    if (ringingTimeoutRef.current) clearTimeout(ringingTimeoutRef.current);

    setActiveCall({
      type,
      status: "missed",
      duration: 0,
      callerName: TRANSLATIONS[language].incomingCall,
      aiUtterance: TRANSLATIONS[language].missedCallAlert,
      userSpeech: "",
      stepIndex: 0,
      shopIndex: 0,
      itemIndex: 0,
      tempPurchases: [],
      tempPrices: []
    });

    if (type !== "on_demand") {
      setRetryCallType(type);
      setRetryTimeRemaining(15); // 15 minutes retry for unanswered
    }

    // Dismiss the missed call notification after 4 seconds
    setTimeout(() => {
      setActiveCall(current => current?.status === "missed" ? null : current);
    }, 4000);
  };

  // Ringing accepted -> active call
  const handleAcceptCall = async () => {
    if (!activeCall) return;
    if (isCallLoopActiveRef.current) {
      console.log("[Call Loop] handleAcceptCall aborted: loop is already active.");
      return;
    }
    
    // Clear ringing timeout
    if (ringingTimeoutRef.current) clearTimeout(ringingTimeoutRef.current);

    isCallLoopActiveRef.current = true;
    const activeSession: CallSession = {
      ...activeCall,
      status: "active"
    };

    setActiveCall(activeSession);
    
    // Start timer incrementer
    callTimerRef.current = setInterval(() => {
      setActiveCall(curr => {
        if (curr && curr.status === "active") {
          return { ...curr, duration: curr.duration + 1 };
        }
        return curr;
      });
    }, 1000);

    try {
      console.log("[Call Loop] Speaking initial greeting:", JSON.stringify(activeSession.aiUtterance));
      await synthesizeSpeech(activeSession.aiUtterance, language);
      console.log("[Call Loop] Initial greeting finished playing.");
      
      // Start the voice-only call loop
      runCallVoiceListening();
    } catch (err) {
      console.error("[Call Loop] Initial greeting synthesize error:", err);
      runCallVoiceListening();
    }
  };

  // End active call
  const handleEndCall = () => {
    isCallLoopActiveRef.current = false;
    setCallIsListening(false);
    if (callListeningSessionRef.current) {
      console.log("[Call Loop] Stopping call recording on hangup...");
      callListeningSessionRef.current.stop();
      callListeningSessionRef.current = null;
    }
    if (callTimerRef.current) clearInterval(callTimerRef.current);
    if (ringingTimeoutRef.current) clearTimeout(ringingTimeoutRef.current);
    
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }

    setActiveCall(null);
    refreshData();
  };

  const runCallVoiceListening = async () => {
    if (!isCallLoopActiveRef.current) {
      console.log("[Call Loop] Listening loop aborted (call ended).");
      return;
    }
    
    console.log("[Call Loop] Starting user voice recording...");
    setCallIsListening(true);
    
    const transcriptionPromise = new Promise<string>((resolve, reject) => {
      const session = startContinuousListening(
        (transcript) => resolve(transcript),
        (err) => reject(err),
        language
      );
      callListeningSessionRef.current = session;
    });

    // Record for 7 seconds per turn
    const timeoutId = setTimeout(() => {
      console.log("[Call Loop] 7s silence/speaking limit reached. Stopping recorder...");
      if (callListeningSessionRef.current) {
        callListeningSessionRef.current.stop();
        callListeningSessionRef.current = null;
      }
    }, 7000);

    try {
      const transcript = await transcriptionPromise;
      clearTimeout(timeoutId);
      setCallIsListening(false);
      
      console.log("[Call Loop] User voice transcribed:", JSON.stringify(transcript));
      if (!isCallLoopActiveRef.current) return;
      
      // Feed to the state machine
      await handleCallVoiceInput(transcript);
    } catch (err: any) {
      clearTimeout(timeoutId);
      setCallIsListening(false);
      console.error("[Call Loop] Recording/STT error:", err);
      
      if (isCallLoopActiveRef.current) {
        // Speak fallback prompt to keep call alive
        const prompt = language === "mr" 
          ? "कृपया पुन्हा सांगा." 
          : "Please repeat that.";
        await synthesizeSpeech(prompt, language);
        runCallVoiceListening();
      }
    }
  };

  // Interactive Call voice responder (state machine interface)
  const handleCallVoiceInput = async (spokenText: string) => {
    console.log("[Call Mode] handleCallVoiceInput triggered. Input:", JSON.stringify(spokenText));
    const currentCall = activeCallRef.current;
    if (!currentCall || currentCall.status !== "active") {
      console.log("[Call Mode] Aborting: No active call or call is not in active state. Current ref:", currentCall);
      return;
    }
    
    const query = spokenText.toLowerCase().trim();
    const numbers = query.match(/\d+/g)?.map(n => parseInt(n, 10)) || [];
    console.log("[Call Mode] Current call session state:", {
      type: currentCall.type,
      status: currentCall.status,
      duration: currentCall.duration,
      stepIndex: currentCall.stepIndex,
      shopIndex: currentCall.shopIndex,
      itemIndex: currentCall.itemIndex,
      tempPurchasesLength: currentCall.tempPurchases.length,
      parsedQuery: query,
      parsedNumbers: numbers
    });
    
    let nextUtterance = "";
    let nextStepIndex = currentCall.stepIndex;
    let nextShopIndex = currentCall.shopIndex;
    let nextItemIndex = currentCall.itemIndex;
    let nextTempPurchases = [...currentCall.tempPurchases];
    let isDone = false;

    // --- MORNING CALL STATE MACHINE ---
    if (currentCall.type === "morning") {
      console.log("[Call Mode] Processing Morning Call flow...");
      // Step 0: capturing items
      if (nextStepIndex === 0) {
        const isDoneCommand = query.includes("done") || query.includes("that's all") || 
                             query.includes("संपले") || query.includes("झालं");
        
        if (isDoneCommand) {
          console.log("[Call Mode] 'Done' command matched.");
          // Move to confirmation step
          if (nextTempPurchases.length === 0) {
            console.log("[Call Mode] Warning: No purchases recorded. Remaining on step 0.");
            nextUtterance = language === "mr"
              ? "तुम्ही कोणतीही खरेदी नोंदवली नाही. खरेदी नोंदवायची आहे का?"
              : "You haven't logged any purchases yet. Would you like to log one?";
          } else {
            const summaryStr = nextTempPurchases.map(p => `${p.quantity} ${p.itemName}`).join(", ");
            console.log("[Call Mode] Moving to Step 1 (Confirmation) with purchases:", summaryStr);
            nextUtterance = language === "mr"
              ? `तुमची आजची एकूण खरेदी: ${summaryStr}. हे बरोबर आहे का? 'होय' किंवा 'नाही' म्हणा.`
              : `Confirming today's purchases: ${summaryStr}. Is this correct? Say 'yes' or 'no'.`;
            nextStepIndex = 1; // confirmation step
          }
        } else {
          // Extract item and numbers
          const matchedItem = items.find(i => query.includes(i.name.toLowerCase()) || i.aliases.some(a => query.includes(a.toLowerCase())));
          console.log("[Call Mode] Item matching attempt:", matchedItem ? matchedItem.name : "none");
          
          if (matchedItem && numbers.length >= 2) {
            const qty = numbers[0];
            const price = numbers[1];
            console.log("[Call Mode] Successfully extracted purchase parameters:", { item: matchedItem.name, qty, price });
            
            nextTempPurchases.push({
              itemName: matchedItem.name,
              quantity: qty,
              pricePaid: price
            });

            nextUtterance = language === "mr"
              ? `नोंद केली: ${qty} ${matchedItem.name} ₹${price} मध्ये. पुढे सांगा किंवा 'संपले' म्हणा.`
              : `Recorded ${qty} units of ${matchedItem.name} for ₹${price}. Anything else?`;
          } else {
            console.log("[Call Mode] Failed to parse item, quantity, and price. Prompting format help.");
            nextUtterance = language === "mr"
              ? "कृपया वस्तूचे नाव, वजन (संख्या) आणि किंमत सांगा. उदाहरणार्थ: '१० बटाटे शंभर रुपये'."
              : "Please specify the item name, quantity, and total price paid. E.g. '10 potato for 100 rupees'.";
          }
        }
      } 
      // Step 1: Confirmation
      else if (nextStepIndex === 1) {
        console.log("[Call Mode] Confirmation step processing query:", query);
        if (query.includes("yes") || query.includes("हो") || query.includes("बरोबर")) {
          console.log("[Call Mode] Save confirmed. Committing purchases to business ledger database:");
          // Save all purchases to database
          nextTempPurchases.forEach(p => {
            console.log(` -> Logging: ${p.quantity} units of ${p.itemName} (Paid: ₹${p.pricePaid})`);
            db.logPurchase(selectedDate, p.itemName, p.quantity, p.pricePaid);
          });
          nextUtterance = language === "mr"
            ? "सर्व खरेदी यशस्वीरित्या जतन केली आहे. धन्यवाद, कॉल संपवत आहे!"
            : "All purchases have been saved successfully. Thank you, goodbye!";
          isDone = true;
        } else {
          console.log("[Call Mode] Save declined. Resetting purchases and returning to step 0.");
          // Reset
          nextTempPurchases = [];
          nextStepIndex = 0;
          nextUtterance = language === "mr"
            ? "ठीक आहे, आपण पुन्हा सुरू करूया. खरेदी सांगा."
            : "No problem. Let's restart. Please say your purchases.";
        }
      }
    }
    
    // --- NIGHT PRICING CALL STATE MACHINE ---
    else if (currentCall.type === "night") {
      console.log("[Call Mode] Processing Night Pricing Call flow...");
      const unpriced = db.getUnpricedItems(selectedDate);
      const shopsList = Object.keys(unpriced);
      console.log("[Call Mode] Unpriced shops list:", shopsList);
      
      if (shopsList.length === 0) {
        console.log("[Call Mode] All shops already priced. Ending call.");
        nextUtterance = language === "mr"
          ? "सर्व दर सेट केले आहेत. धन्यवाद!"
          : "All prices are set. Thank you!";
        isDone = true;
      } else {
        const currentShopName = shopsList[nextShopIndex];
        const itemsList = unpriced[currentShopName];
        const currentItemName = itemsList[nextItemIndex];
        console.log("[Call Mode] Current Shop:", currentShopName, "Current Item:", currentItemName);

        if (nextStepIndex === 0) {
          // Step 0: capturing price
          const price = numbers[0];
          console.log("[Call Mode] Price parsing attempt:", price);
          if (price) {
            console.log(`[Call Mode] Setting price in database: ${currentItemName} at ${currentShopName} = ₹${price}`);
            // Apply price setting in database
            db.setPrice(currentShopName, selectedDate, currentItemName, price);

            // Move to next item or next shop
            if (nextItemIndex + 1 < itemsList.length) {
              nextItemIndex += 1;
              const nextItem = itemsList[nextItemIndex];
              console.log("[Call Mode] Moving to next item in same shop:", nextItem);
              nextUtterance = language === "mr"
                ? `${currentItemName} चा दर ₹${price} सेट केला आहे. आता ${currentShopName} च्या ${nextItem} चा दर काय आहे?`
                : `Set ${currentItemName} to ₹${price}. What is the price for ${nextItem} at ${currentShopName}?`;
            } else if (nextShopIndex + 1 < shopsList.length) {
              nextShopIndex += 1;
              nextItemIndex = 0;
              const nextShop = shopsList[nextShopIndex];
              const nextItem = unpriced[nextShop][0];
              console.log("[Call Mode] Moving to next shop:", nextShop, "and its first item:", nextItem);
              nextUtterance = language === "mr"
                ? `${currentItemName} चा दर ₹${price} सेट केला आहे. आता ${nextShop} दुकानासाठी, ${nextItem} चा दर काय आहे?`
                : `Set ${currentItemName} to ₹${price}. Now for ${nextShop}, what is the price for ${nextItem}?`;
            } else {
              console.log("[Call Mode] All shops and items successfully priced. Moving to step 1 (invoice generation confirmation).");
              // All priced and locked! Prompt to generate bill
              nextUtterance = language === "mr"
                ? `सर्व दुकानांचे दर नोंदवले आहेत आणि बिले लॉक झाली आहेत. मी बिल पाठवू का? 'होय' किंवा 'नाही' म्हणा.`
                : "All shops are priced and locked. Should I prepare the invoice to send? Say 'yes' or 'no'.";
              nextStepIndex = 1; // invoice prompt step
            }
          } else {
            console.log("[Call Mode] Failed to parse price from input.");
            nextUtterance = language === "mr"
              ? `दर समजला नाही. कृपया दर पुन्हा सांगा.`
              : "I didn't catch the price. Please repeat the unit rate.";
          }
        } else if (nextStepIndex === 1) {
          console.log("[Call Mode] Night billing confirmation step query:", query);
          if (query.includes("yes") || query.includes("हो") || query.includes("पाठव")) {
            console.log("[Call Mode] Invoice confirmation received. Triggering billing runs for all locked ledger shops:");
            // Generate invoices for all shops that had deliveries today
            db.getShops().forEach(s => {
              const led = db.getLedger(s.name, selectedDate);
              console.log(` - Checking ledger for ${s.name}: exists=`, !!led, "status=", led?.status);
              if (led && led.status === "locked") {
                console.log(`   -> Generating invoice for shop: ${s.name}`);
                db.generateInvoice(s.name, selectedDate);
              }
            });
            nextUtterance = language === "mr"
              ? "बिले तयार करून पाठवली आहेत. धन्यवाद, शुभ रात्री!"
              : "Invoices generated and shared. Thank you, good night!";
          } else {
            console.log("[Call Mode] Invoice generation declined.");
            nextUtterance = language === "mr"
              ? "ठीक आहे, बिले जतन केली आहेत. तुम्ही नंतर शेअर करू शकता. शुभ रात्री!"
              : "Okay, bills are saved. You can share them manually later. Good night!";
          }
          isDone = true;
        }
      }
    }
    
    // --- ON DEMAND CALL STATE MACHINE ---
    else {
      console.log("[Call Mode] On-Demand Call: Forwarding input text to Gemini NLP engine...");
      const result = await processVoiceInput(spokenText, role, language);
      console.log("[Call Mode] Gemini NLP response received:", JSON.stringify(result.responseText));
      nextUtterance = result.responseText;
      if (query.includes("bye") || query.includes("थांब") || query.includes("कॉल संपवा")) {
        console.log("[Call Mode] Match call-termination command. Hanging up.");
        isDone = true;
      }
    }

    console.log("[Call Mode] Updating active call state:", {
      nextUtterance,
      nextStepIndex,
      nextShopIndex,
      nextItemIndex,
      nextTempPurchasesLength: nextTempPurchases.length,
      isDone
    });

    setActiveCall(curr => {
      if (curr) {
        return {
          ...curr,
          aiUtterance: nextUtterance,
          userSpeech: spokenText,
          stepIndex: nextStepIndex,
          shopIndex: nextShopIndex,
          itemIndex: nextItemIndex,
          tempPurchases: nextTempPurchases
        };
      }
      return curr;
    });

    try {
      console.log("[Call Loop] AI speaking reply:", JSON.stringify(nextUtterance));
      await synthesizeSpeech(nextUtterance, language);
      console.log("[Call Loop] AI reply playback completed.");
    } catch (err) {
      console.error("[Call Loop] AI reply synthesize error:", err);
    }

    if (isDone) {
      console.log("[Call Mode] Scheduled call hangup in 5 seconds...");
      setTimeout(() => {
        handleEndCall();
      }, 5000);
    } else {
      // Loop: Start listening again
      runCallVoiceListening();
    }
  };

  // Simulated Time controller: Advances simulated clock and evaluates scheduled calls
  const handleTimeWarp = (minutes: number) => {
    let newMin = simulatedMinute + minutes;
    let newHr = simulatedHour;

    if (newMin >= 60) {
      newHr += Math.floor(newMin / 60);
      newMin = newMin % 60;
    }
    if (newHr >= 24) {
      newHr = newHr % 24;
    }

    setSimulatedHour(newHr);
    setSimulatedMinute(newMin);

    // Update active retry timer if applicable
    if (retryCallType && retryTimeRemaining !== null) {
      const nextRemaining = Math.max(0, retryTimeRemaining - minutes);
      setRetryTimeRemaining(nextRemaining);

      if (nextRemaining === 0) {
        setRetryCallType(null);
        setRetryTimeRemaining(null);
        initiateRinging(retryCallType);
      }
    }

    // Scheduled trigger evaluations:
    // 1. Morning call: 10:00 AM (Hour 10, Min 0)
    const crossedMorning = (simulatedHour < 10 && newHr >= 10) || (simulatedHour === 10 && simulatedMinute < 0 && newMin >= 0);
    if (crossedMorning && !retryCallType) {
      initiateRinging("morning");
    }

    // 2. Night call: 9:00 PM (Hour 21, Min 0)
    const crossedNight = (simulatedHour < 21 && newHr >= 21) || (simulatedHour === 21 && simulatedMinute < 0 && newMin >= 0);
    if (crossedNight && !retryCallType) {
      initiateRinging("night");
    }
  };

  // Admin Approval actions
  const handleApprove = (approvalId: string) => {
    db.approveEntry(approvalId);
    refreshData();
  };

  const handleReject = (approvalId: string) => {
    db.rejectEntry(approvalId);
    refreshData();
  };

  // Direct Inline Edit Save
  const handleSaveEdit = () => {
    if (!editingEntry) return;
    const { shopId, date, itemId, itemName, quantity, unitPrice } = editingEntry;
    
    const shop = shops.find(s => s.id === shopId);
    if (shop) {
      const ledger = db.getLedger(shop.name, date);
      if (ledger && ledger.items[itemId]) {
        const item = ledger.items[itemId];
        item.quantity = quantity;
        item.unitPrice = unitPrice;
        if (unitPrice !== null) {
          item.lineTotal = quantity * unitPrice;
        } else {
          item.lineTotal = null;
        }

        if (ledger.status === 'locked') {
          const oldTotal = ledger.totalBill || 0;
          const newTotal = Object.values(ledger.items).reduce((sum, i) => sum + (i.lineTotal || 0), 0);
          ledger.totalBill = newTotal;
          shop.outstandingBalance = shop.outstandingBalance - oldTotal + newTotal;
        }

        db.saveDatabase();
        refreshData();
      }
    }
    setEditModalVisible(false);
    setEditingEntry(null);
  };

  const handleGenerateAndShareInvoice = (shopName: string, date: string) => {
    if (typeof document === 'undefined') return;
    const shop = shops.find(s => s.name === shopName);
    const ledger = db.getLedger(shopName, date);
    if (!shop || !ledger) return;

    const canvas = document.createElement('canvas');
    canvas.width = 600;
    canvas.height = 750;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Draw background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, 600, 750);

    // Draw border
    ctx.strokeStyle = '#1a237e';
    ctx.lineWidth = 10;
    ctx.strokeRect(5, 5, 590, 740);

    // Draw internal thin border
    ctx.strokeStyle = '#283593';
    ctx.lineWidth = 2;
    ctx.strokeRect(15, 15, 570, 720);

    // Header
    ctx.fillStyle = '#1a237e';
    ctx.font = 'bold 28px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(language === 'mr' ? 'लॉगीट एआय - बिल पत्रक' : 'LOGIT AI - INVOICE', 300, 70);

    ctx.fillStyle = '#757575';
    ctx.font = '14px Arial';
    ctx.fillText(language === 'mr' ? 'खरेदी आणि विक्रीचे खाते' : 'OFFLINE BOOKKEEPING SYSTEM', 300, 95);

    // Invoice Details
    ctx.textAlign = 'left';
    ctx.fillStyle = '#333333';
    ctx.font = 'bold 16px Arial';
    ctx.fillText(`${language === 'mr' ? 'ग्राहक (दुकान)' : 'Shop'}: ${shopName}`, 50, 150);
    ctx.fillText(`${language === 'mr' ? 'दिनांक' : 'Date'}: ${date}`, 50, 180);
    ctx.fillText(`${language === 'mr' ? 'स्थिती' : 'Status'}: ${language === 'mr' ? 'लॉक आणि फायनल' : 'Locked & Finalized'}`, 50, 210);

    // Draw table header
    ctx.fillStyle = '#1a237e';
    ctx.fillRect(50, 240, 500, 35);
    
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 14px Arial';
    ctx.fillText(language === 'mr' ? 'वस्तू' : 'Item', 70, 262);
    ctx.fillText(language === 'mr' ? 'प्रमाण (Qty)' : 'Qty', 250, 262);
    ctx.fillText(language === 'mr' ? 'दर (Rate)' : 'Rate', 370, 262);
    ctx.fillText(language === 'mr' ? 'एकूण (Total)' : 'Total', 470, 262);

    // Draw table items
    let y = 310;
    ctx.fillStyle = '#333333';
    ctx.font = '14px Arial';
    Object.values(ledger.items).forEach((item) => {
      ctx.fillText(item.itemName, 70, y);
      ctx.fillText(item.quantity.toString(), 250, y);
      ctx.fillText(`₹${item.unitPrice ?? 0}`, 370, y);
      ctx.fillText(`₹${item.lineTotal ?? 0}`, 470, y);
      
      // Draw thin row separator line
      ctx.strokeStyle = '#e0e0e0';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(50, y + 10);
      ctx.lineTo(550, y + 10);
      ctx.stroke();
      
      y += 40;
    });

    // Draw Totals section
    y += 20;
    ctx.strokeStyle = '#1a237e';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(50, y);
    ctx.lineTo(550, y);
    ctx.stroke();

    y += 30;
    ctx.fillStyle = '#2e7d32';
    ctx.font = 'bold 20px Arial';
    ctx.fillText(language === 'mr' ? 'एकूण रक्कम (Grand Total):' : 'Grand Total:', 50, y);
    ctx.fillText(`₹${ledger.totalBill ?? 0}`, 450, y);

    y += 35;
    ctx.fillStyle = '#e65100';
    ctx.font = 'bold 16px Arial';
    ctx.fillText(`${language === 'mr' ? 'दुकानाची बाकी रक्कम (Outstanding)' : 'Total Outstanding Balance'}:`, 50, y);
    ctx.fillText(`₹${shop.outstandingBalance}`, 450, y);

    // Draw footer note
    y += 60;
    ctx.textAlign = 'center';
    ctx.fillStyle = '#757575';
    ctx.font = 'italic 12px Arial';
    ctx.fillText(language === 'mr' ? 'लॉगीट एआय वापरल्याबद्दल धन्यवाद!' : 'Thank you for using Logit AI!', 300, y);

    // Convert to base64 image URL
    const dataUrl = canvas.toDataURL('image/png');
    setInvoiceImageUrl(dataUrl);
    setSharingShopName(shopName);
    setSharingDate(date);
    setInvoiceModalVisible(true);

    // Trigger actual native share if available
    const nav = typeof navigator !== 'undefined' ? navigator : null;
    if (nav && nav.share) {
      fetch(dataUrl)
        .then(res => res.blob())
        .then(blob => {
          const file = new File([blob], `Invoice-${shopName}-${date}.png`, { type: 'image/png' });
          if (nav.canShare && nav.canShare({ files: [file] })) {
            nav.share({
              files: [file],
              title: `Invoice for ${shopName}`,
              text: `Here is the invoice for ${shopName} on ${date}.`
            }).catch(err => console.log('Share failed', err));
          }
        });
    }
  };

  const handleResetData = () => {
    if (confirm("Are you sure you want to clear all data? This will reset to default setup.")) {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.removeItem('logit_ai_db');
      }
      db.loadDatabase();
      refreshData();
    }
  };

  const t = TRANSLATIONS[language];

  // Onboarding Screen
  if (!hasOnboarded) {
    return (
      <View style={styles.onboardContainer}>
        <View style={styles.onboardCard}>
          <Text style={styles.onboardTitle}>{t.onboardingTitle}</Text>
          
          <Text style={styles.labelSection}>{t.selectLang}</Text>
          <View style={styles.row}>
            <TouchableOpacity
              style={[styles.toggleBtn, language === 'en' && styles.activeBtn]}
              onPress={() => setLanguage('en')}
            >
              <Text style={styles.btnText}>English</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.toggleBtn, language === 'mr' && styles.activeBtn]}
              onPress={() => setLanguage('mr')}
            >
              <Text style={styles.btnText}>मराठी (Marathi)</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.labelSection}>{t.selectRole}</Text>
          <TouchableOpacity
            style={[styles.roleSelectCard, role === 'admin' && styles.activeRoleCard]}
            onPress={() => setRole('admin')}
          >
            <Text style={styles.roleCardText}>👩‍💼 {t.adminRole}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.roleSelectCard, role === 'normal' && styles.activeRoleCard]}
            onPress={() => setRole('normal')}
          >
            <Text style={styles.roleCardText}>🧔 {t.normalRole}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.startBtn} onPress={handleStartOnboarding}>
            <Text style={styles.startBtnText}>{t.startBtn} 🚀</Text>
          </TouchableOpacity>
        </View>
        <StatusBar style="light" />
      </View>
    );
  }

  // Render Drawer
  const renderDrawer = () => {
    if (!isDrawerOpen) return null;

    return (
      <View style={StyleSheet.absoluteFill}>
        {/* Backdrop overlay */}
        <Pressable style={StyleSheet.absoluteFill} onPress={handleCloseDrawer}>
          <Animated.View style={[styles.drawerBackdrop, animatedBackdropStyle]} />
        </Pressable>

        {/* Panel */}
        <Animated.View style={[styles.drawerPanel, animatedDrawerStyle]}>
          <View style={styles.drawerHeader}>
            <Text style={styles.drawerTitle}>Logit AI</Text>
            <TouchableOpacity style={styles.drawerCloseBtn} onPress={handleCloseDrawer}>
              <X size={22} color={Theme.colors.primaryText} strokeWidth={1.5} />
            </TouchableOpacity>
          </View>

          {/* New Chat Button */}
          <TouchableOpacity style={styles.newChatBtn} onPress={() => handleNavPress('home')}>
            <Text style={styles.newChatBtnText}>New Chat</Text>
            <Plus size={18} color={Theme.colors.primaryText} strokeWidth={1.5} />
          </TouchableOpacity>

          <ScrollView style={styles.drawerScroll} contentContainerStyle={styles.drawerScrollContent}>
            {/* History Section */}
            <TouchableOpacity
              style={[styles.drawerNavItem, currentTab === 'home' && styles.drawerNavItemActive]}
              onPress={() => handleNavPress('home')}
            >
              <MessageSquare size={18} color={currentTab === 'home' ? Theme.colors.primaryText : Theme.colors.secondaryText} strokeWidth={1.5} />
              <Text style={[styles.drawerNavText, currentTab === 'home' && styles.drawerNavTextActive]}>Conversation History</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.drawerNavItem}
              onPress={() => {
                handleCloseDrawer();
                Alert.alert(
                  language === 'mr' ? 'व्हॉइस इतिहास' : 'Voice History',
                  language === 'mr' ? 'सर्व व्हॉइस नोट्स लेजरमध्ये सुरक्षितपणे जतन केल्या आहेत.' : 'All voice notes are securely recorded in the Ledger.',
                  [{ text: 'OK', style: 'cancel' }]
                );
              }}
            >
              <History size={18} color={Theme.colors.secondaryText} strokeWidth={1.5} />
              <Text style={styles.drawerNavText}>Voice History</Text>
            </TouchableOpacity>

            {/* Divider */}
            <View style={styles.drawerDivider} />

            {/* Shops Section */}
            <Text style={styles.drawerSectionHeader}>Shops</Text>
            {shops.map(shop => {
              const isSelected = selectedShopId === shop.id;
              return (
                <TouchableOpacity
                  key={shop.id}
                  style={[
                    styles.drawerShopCard,
                    isSelected && styles.drawerShopCardSelected
                  ]}
                  onPress={() => {
                    setSelectedShopId(shop.id);
                    handleNavPress('ledger');
                  }}
                >
                  <Folder size={18} color={isSelected ? Theme.colors.accent : Theme.colors.secondaryText} strokeWidth={1.5} />
                  <Text
                    style={[
                      styles.drawerShopCardText,
                      isSelected && styles.drawerShopCardTextSelected
                    ]}
                    numberOfLines={1}
                  >
                    {shop.name}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* Footer Section */}
          <View style={styles.drawerFooter}>
            <TouchableOpacity
              style={styles.drawerFooterLink}
              onPress={() => {
                setSelectedShopId(null);
                handleNavPress('settings');
              }}
            >
              <PlusCircle size={18} color={Theme.colors.secondaryText} strokeWidth={1.5} />
              <Text style={styles.drawerFooterLinkText}>Add Shop</Text>
            </TouchableOpacity>

            {role === 'admin' && (
              <TouchableOpacity
                style={styles.drawerFooterLink}
                onPress={() => handleNavPress('approvals')}
              >
                <CheckSquare size={18} color={Theme.colors.secondaryText} strokeWidth={1.5} />
                <Text style={styles.drawerFooterLinkText}>Approvals</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={styles.drawerFooterLink}
              onPress={() => handleNavPress('settings')}
            >
              <SettingsIcon size={18} color={Theme.colors.secondaryText} strokeWidth={1.5} />
              <Text style={styles.drawerFooterLinkText}>Settings</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.drawerFooterLink}
              onPress={() => {
                Alert.alert(
                  'About Logit AI',
                  'Version 1.0.0\n\nA premium voice assistant for store auditing, ledger management, and inventory tracking powered by Gemini and Sarvam AI.',
                  [{ text: 'OK', style: 'cancel' }]
                );
              }}
            >
              <Info size={18} color={Theme.colors.secondaryText} strokeWidth={1.5} />
              <Text style={styles.drawerFooterLinkText}>About</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeContainer}>
      <View style={styles.container}>
        {/* Top bar */}
        <View style={styles.topBar}>
          <TouchableOpacity style={styles.topBarButton} onPress={() => setIsDrawerOpen(true)}>
            <MenuIcon size={24} color={Theme.colors.primaryText} strokeWidth={1.5} />
          </TouchableOpacity>
          <Text style={styles.topBarTitle}>Logit AI</Text>
          <TouchableOpacity style={styles.topBarButton} onPress={() => initiateRinging("on_demand")}>
            <Phone size={24} color={Theme.colors.primaryText} strokeWidth={1.5} />
          </TouchableOpacity>
        </View>

        {/* Main Tab Views */}
        <View style={styles.content}>
          {currentTab === 'home' && (
            <View style={styles.homeTabContainer}>
              <ScrollView
                ref={scrollViewRef}
                contentContainerStyle={[styles.tabContent, { paddingBottom: 140 }]}
              >
                {/* Simulated Scheduler & Time warp widget */}
                <View style={styles.simulatedTimeWidget}>
                  <View style={styles.simTimeHeader}>
                    <Text style={styles.simTimeLabel}>🕰️ {t.simTimeLabel}</Text>
                    <Text style={styles.simTimeClock}>{getFormattedSimTime()}</Text>
                  </View>

                  {/* Time Warp Actions */}
                  <View style={styles.row}>
                    <TouchableOpacity style={styles.warpBtn} onPress={() => handleTimeWarp(15)}>
                      <Text style={styles.warpBtnText}>{t.timeWarp15}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.warpBtn} onPress={() => handleTimeWarp(30)}>
                      <Text style={styles.warpBtnText}>{t.timeWarp30}</Text>
                    </TouchableOpacity>
                  </View>

                  {/* Instant Call Triggers */}
                  <View style={styles.row}>
                    <TouchableOpacity style={styles.triggerCallBtn} onPress={() => initiateRinging("morning")}>
                      <Text style={styles.triggerCallBtnText}>{t.triggerMorningCall}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.triggerCallBtn} onPress={() => initiateRinging("night")}>
                      <Text style={styles.triggerCallBtnText}>{t.triggerNightCall}</Text>
                    </TouchableOpacity>
                  </View>

                  {/* Active Retry Banners */}
                  {retryCallType && retryTimeRemaining !== null && (
                    <View style={styles.retryBanner}>
                      <Text style={styles.retryBannerText}>
                        ⏳ {t.retryBanner} {retryTimeRemaining} {t.minutes} ({retryCallType === 'morning' ? t.morningCallTitle : t.nightCallTitle})
                      </Text>
                    </View>
                  )}
                </View>

                {/* Chat Messages */}
                <View style={styles.chatContainer}>
                  {chatMessages.map((msg) => {
                    const isUser = msg.sender === 'user';
                    return (
                      <View
                        key={msg.id}
                        style={[
                          styles.chatMessageRow,
                          isUser ? styles.chatRowUser : styles.chatRowAssistant
                        ]}
                      >
                        {isUser ? (
                          <View style={styles.userMessagePill}>
                            <Text style={styles.userMessageText}>{msg.text}</Text>
                          </View>
                        ) : (
                          <View style={styles.assistantMessageContainer}>
                            <Text style={styles.assistantMessageText}>{msg.text}</Text>
                          </View>
                        )}
                      </View>
                    );
                  })}

                  {/* Typing Indicator */}
                  {isProcessing && (
                    <View style={styles.chatRowAssistant}>
                      <View style={styles.assistantMessageContainer}>
                        <Text style={styles.typingIndicatorText}>
                          {language === 'mr' ? 'प्रक्रिया करत आहे...' : 'Logit AI is typing...'}
                        </Text>
                      </View>
                    </View>
                  )}
                </View>

                {/* Controls */}
                <View style={styles.voiceControlsContainer}>
                  <TouchableOpacity
                    style={[styles.micBigButton, isListening && styles.micListeningActive]}
                    onPress={handleMicPress}
                  >
                    <Text style={styles.micIconText}>{isListening ? "⏹️" : "🎙️"}</Text>
                    <Text style={styles.micButtonSubtext}>{t.quickNoteTitle}</Text>
                  </TouchableOpacity>
                </View>

                {/* Large Call Mode Trigger */}
                <TouchableOpacity style={styles.fullWidthCallBtn} onPress={() => initiateRinging("on_demand")}>
                  <Text style={styles.fullWidthCallBtnText}>{t.callBtn}</Text>
                </TouchableOpacity>
              </ScrollView>

              {/* Floating Bottom Input Pill */}
              <View style={styles.floatingInputWrapper}>
                <View style={styles.inputPill}>
                  <TouchableOpacity style={styles.inputPillAction}>
                    <Plus size={20} color={Theme.colors.mutedText} strokeWidth={1.5} />
                  </TouchableOpacity>
                  <TextInput
                    style={styles.pillTextInput}
                    value={textCommand}
                    onChangeText={setTextCommand}
                    placeholder={isListening ? t.micListening : isProcessing ? t.micProcessing : "Ask Logit AI..."}
                    placeholderTextColor={Theme.colors.mutedText}
                    onSubmitEditing={() => {
                      if (textCommand.trim()) {
                        submitTextInput(textCommand);
                      }
                    }}
                  />
                  {textCommand.trim() ? (
                    <TouchableOpacity
                      style={styles.pillSendBtn}
                      onPress={() => submitTextInput(textCommand)}
                    >
                      <Send size={18} color={Theme.colors.accent} strokeWidth={2} />
                    </TouchableOpacity>
                  ) : (
                    <TouchableOpacity
                      style={[styles.pillMicBtn, isListening && styles.pillMicBtnActive]}
                      onPress={handleMicPress}
                    >
                      <Mic size={18} color={isListening ? Theme.colors.primaryText : Theme.colors.mutedText} strokeWidth={1.5} />
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            </View>
          )}

        {currentTab === 'ledger' && (
          <ScrollView contentContainerStyle={styles.tabContent}>
            <Text style={styles.sectionTitle}>{t.ledgerTitle}</Text>
            
            {/* Date Selector Row */}
            <View style={styles.dateSelectorRow}>
              <Text style={styles.dateLabel}>Date:</Text>
              <TextInput
                style={styles.dateInput}
                value={selectedDate}
                onChangeText={setSelectedDate}
                placeholder="YYYY-MM-DD"
              />
            </View>

            {/* Render ledger tables per shop */}
            {shops.map(shop => {
              const ledger = db.getLedger(shop.name, selectedDate);
              const hasItems = ledger && Object.keys(ledger.items).length > 0;

              return (
                <View key={shop.id} style={styles.ledgerShopCard}>
                  <View style={styles.ledgerShopHeader}>
                    <Text style={styles.ledgerShopName}>🏪 {shop.name}</Text>
                    <View style={styles.ledgerShopBalance}>
                      <Text style={styles.balanceText}>{t.outstandingBalance}: ₹{shop.outstandingBalance}</Text>
                    </View>
                  </View>

                  {hasItems ? (
                    <View>
                      {/* Status indicator */}
                      <View style={styles.ledgerStatusIndicator}>
                        <Text style={styles.statusBadge}>
                          Status: {ledger.status === 'locked' ? `🔒 ${t.lockedLabel}` : ledger.status === 'priced' ? "💰 Priced" : "📝 Open"}
                        </Text>
                        {ledger.totalBill !== null && (
                          <Text style={styles.totalBillText}>₹{ledger.totalBill}</Text>
                        )}
                      </View>

                      {/* Items Table */}
                      <View style={styles.tableHeader}>
                        <Text style={[styles.th, {flex: 2}]}>Item</Text>
                        <Text style={[styles.th, {flex: 1, textAlign: 'center'}]}>Qty</Text>
                        <Text style={[styles.th, {flex: 1, textAlign: 'right'}]}>Rate</Text>
                        <Text style={[styles.th, {flex: 1.5, textAlign: 'right'}]}>Total</Text>
                        <Text style={[styles.th, {flex: 1, textAlign: 'center'}]}>Edit</Text>
                      </View>

                      {Object.values(ledger.items).map((item) => (
                        <View key={item.id} style={styles.tableRow}>
                          <Text style={[styles.td, {flex: 2}]}>
                            {item.itemName} {item.status === 'pending_approval' && "⏳"}
                          </Text>
                          <Text style={[styles.td, {flex: 1, textAlign: 'center'}]}>{item.quantity}</Text>
                          <Text style={[styles.td, {flex: 1, textAlign: 'right'}]}>
                            {item.unitPrice !== null ? `₹${item.unitPrice}` : "-"}
                          </Text>
                          <Text style={[styles.td, {flex: 1.5, textAlign: 'right'}]}>
                            {item.lineTotal !== null ? `₹${item.lineTotal}` : "-"}
                          </Text>
                          
                          <TouchableOpacity
                            style={styles.editRowBtn}
                            onPress={() => {
                              setEditingEntry({
                                shopId: shop.id,
                                date: selectedDate,
                                itemId: item.id,
                                itemName: item.itemName,
                                quantity: item.quantity,
                                unitPrice: item.unitPrice
                              });
                              setEditModalVisible(true);
                            }}
                          >
                            <Text>✏️</Text>
                          </TouchableOpacity>
                        </View>
                      ))}
                      {ledger.status === 'locked' && (
                        <TouchableOpacity
                          style={styles.generateInvoiceBtn}
                          onPress={() => handleGenerateAndShareInvoice(shop.name, selectedDate)}
                        >
                          <Text style={styles.generateInvoiceBtnText}>
                            📤 {t.generateInvoiceBtn}
                          </Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  ) : (
                    <Text style={styles.emptyText}>{t.noEntries}</Text>
                  )}
                </View>
              );
            })}
          </ScrollView>
        )}

        {currentTab === 'approvals' && (
          <ScrollView contentContainerStyle={styles.tabContent}>
            <Text style={styles.sectionTitle}>{t.approvalsTitle}</Text>
            {pendingApprovals.length > 0 ? (
              pendingApprovals.map((req) => (
                <View key={req.id} style={styles.approvalCard}>
                  <View style={styles.approvalHeader}>
                    <Text style={styles.approvalTypeBadge}>
                      {req.type === 'delivery' ? "📦 Delivery" : "💰 Payment"}
                    </Text>
                    <Text style={styles.approvalTime}>
                      {new Date(req.submittedAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                    </Text>
                  </View>
                  
                  <View style={styles.approvalBody}>
                    {req.type === 'delivery' ? (
                      <Text style={styles.approvalDetails}>
                        Shop: <Text style={{fontWeight: 'bold'}}>{db.getShops().find(s => s.id === req.data.shopId)?.name}</Text>{"\n"}
                        Item: {req.data.itemName} | Qty: {req.data.quantity}
                      </Text>
                    ) : (
                      <Text style={styles.approvalDetails}>
                        Shop: <Text style={{fontWeight: 'bold'}}>{db.getShops().find(s => s.id === req.data.shopId)?.name}</Text>{"\n"}
                        Amount: ₹{req.data.payment.amount}
                      </Text>
                    )}
                  </View>

                  <View style={styles.approvalActions}>
                    <TouchableOpacity
                      style={[styles.approvalBtn, {backgroundColor: '#2e7d32'}]}
                      onPress={() => handleApprove(req.id)}
                    >
                      <Text style={styles.approvalBtnText}>✅ {t.confirmApprove}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.approvalBtn, {backgroundColor: '#c62828'}]}
                      onPress={() => handleReject(req.id)}
                    >
                      <Text style={styles.approvalBtnText}>❌ {t.confirmReject}</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))
            ) : (
              <Text style={styles.emptyText}>{t.noApprovals}</Text>
            )}
          </ScrollView>
        )}

        {currentTab === 'settings' && (
          <ScrollView contentContainerStyle={styles.tabContent}>
            <Text style={styles.sectionTitle}>{t.settingsTitle}</Text>

            <View style={styles.settingsGroup}>
              <Text style={styles.settingsLabel}>{t.langLabel}: {language === 'en' ? "English" : "मराठी"}</Text>
              <TouchableOpacity style={styles.toggleBtnWide} onPress={handleToggleLanguage}>
                <Text style={styles.toggleBtnWideText}>{t.toggleLanguage}</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.settingsGroup}>
              <Text style={styles.settingsLabel}>{t.roleLabel}: {role === 'admin' ? t.adminRole : t.normalRole}</Text>
              <TouchableOpacity style={styles.toggleBtnWide} onPress={handleToggleRole}>
                <Text style={styles.toggleBtnWideText}>{t.toggleRole}</Text>
              </TouchableOpacity>
            </View>

            {/* Shop List */}
            <View style={styles.settingsGroup}>
              <Text style={styles.settingsLabel}>{t.shopListTitle}</Text>
              {shops.map(s => (
                <Text key={s.id} style={styles.listItem}>• {s.name} (Balance: ₹{s.outstandingBalance})</Text>
              ))}
            </View>

            {/* Item List */}
            <View style={styles.settingsGroup}>
              <Text style={styles.settingsLabel}>{t.itemListTitle}</Text>
              <View style={styles.itemsWrap}>
                {items.map(i => (
                  <View key={i.id} style={styles.itemTag}>
                    <Text style={styles.itemTagText}>{i.name}</Text>
                  </View>
                ))}
              </View>
            </View>

            {/* Reset data */}
            <TouchableOpacity style={styles.resetBtn} onPress={handleResetData}>
              <Text style={styles.resetBtnText}>⚠️ {t.resetData}</Text>
            </TouchableOpacity>
          </ScrollView>
        )}
      </View>

      {/* --- Phase 4: Call Mode Ringing & Active Screen Modal Overlay --- */}
      {activeCall && (
        <Modal visible={true} animationType="fade" transparent={false}>
          {activeCall.status === "ringing" && (
            <View style={styles.ringingOverlay}>
              <View style={styles.ringingCard}>
                <Text style={styles.ringingStatusLabel}>📞 {t.incomingCall}</Text>
                <Text style={styles.ringingCallerName}>{activeCall.callerName}</Text>
                <View style={styles.ringingPulsar}></View>
                
                <View style={styles.ringingActions}>
                  <TouchableOpacity style={styles.acceptCallBtn} onPress={handleAcceptCall}>
                    <Text style={styles.callActionText}>{t.acceptBtn}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.declineCallBtn} onPress={handleDeclineCall}>
                    <Text style={styles.callActionText}>{t.declineBtn}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          )}

          {activeCall.status === "active" && (
            <View style={styles.activeCallOverlay}>
              <Text style={styles.activeCallTitle}>{activeCall.callerName}</Text>
              
              <Text style={styles.activeCallTimer}>
                ⏱️ {Math.floor(activeCall.duration / 60).toString().padStart(2, '0')}:
                {(activeCall.duration % 60).toString().padStart(2, '0')}
              </Text>

              {/* Voice waveform animation placeholder */}
              <View style={styles.waveformContainer}>
                <View style={[styles.waveBar, {height: 40 + Math.sin(activeCall.duration) * 15}]}></View>
                <View style={[styles.waveBar, {height: 60 + Math.cos(activeCall.duration) * 20}]}></View>
                <View style={[styles.waveBar, {height: 80 + Math.sin(activeCall.duration * 2) * 25}]}></View>
                <View style={[styles.waveBar, {height: 50 + Math.cos(activeCall.duration * 1.5) * 15}]}></View>
              </View>

              {/* AI Speech Utterance Box */}
              <View style={styles.callUtteranceBox}>
                <Text style={styles.callUtteranceText}>🔊 {activeCall.aiUtterance}</Text>
              </View>

              {/* Call Status Indicator */}
              <View style={styles.callStatusIndicatorBox}>
                <Text style={styles.callStatusIndicatorText}>
                  {callIsListening ? (language === 'mr' ? "🎙️ ऐकत आहे..." : "🎙️ Listening...") : (language === 'mr' ? "🔊 बोलत आहे..." : "🔊 Speaking...")}
                </Text>
              </View>

              <TouchableOpacity style={styles.hangupBtn} onPress={handleEndCall}>
                <Text style={styles.hangupBtnText}>{t.endCallBtn}</Text>
              </TouchableOpacity>
            </View>
          )}

          {activeCall.status === "missed" && (
            <View style={styles.missedCallOverlay}>
              <Text style={styles.missedCallText}>🔴 {t.missedCallAlert}</Text>
            </View>
          )}
        </Modal>
      )}

      {/* Manual edit modal */}
      <Modal visible={editModalVisible} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{t.editEntryTitle}</Text>
            {editingEntry && (
              <View>
                <Text style={styles.modalLabel}>Item: {editingEntry.itemName}</Text>
                
                <Text style={styles.modalLabel}>Quantity:</Text>
                <TextInput
                  style={styles.modalInput}
                  keyboardType="numeric"
                  value={editingEntry.quantity.toString()}
                  onChangeText={(val) => setEditingEntry({
                    ...editingEntry,
                    quantity: parseInt(val, 10) || 0
                  })}
                />

                <Text style={styles.modalLabel}>Unit Price (Rate):</Text>
                <TextInput
                  style={styles.modalInput}
                  keyboardType="numeric"
                  value={editingEntry.unitPrice !== null ? editingEntry.unitPrice.toString() : ""}
                  onChangeText={(val) => setEditingEntry({
                    ...editingEntry,
                    unitPrice: val === "" ? null : (parseFloat(val) || 0)
                  })}
                />

                <View style={styles.modalActions}>
                  <TouchableOpacity style={[styles.modalBtn, {backgroundColor: '#1565c0'}]} onPress={handleSaveEdit}>
                    <Text style={styles.modalBtnText}>{t.saveBtn}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.modalBtn, {backgroundColor: '#757575'}]} onPress={() => setEditModalVisible(false)}>
                    <Text style={styles.modalBtnText}>{t.cancelBtn}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>
        </View>
      </Modal>

      {/* Invoice sharing modal */}
      <Modal visible={invoiceModalVisible} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              {language === 'mr' ? 'इनव्हॉइस प्रीव्ह्यू' : 'Invoice Preview'}
            </Text>
            {invoiceImageUrl && (
              <View style={{ alignItems: 'center', marginVertical: 12 }}>
                <Image 
                  source={{ uri: invoiceImageUrl }} 
                  style={{ width: '100%', height: 350, resizeMode: 'contain', borderWidth: 1, borderColor: '#ccc' }} 
                />
              </View>
            )}
            <View style={styles.modalActions}>
              <TouchableOpacity 
                style={[styles.modalBtn, { backgroundColor: '#2e7d32' }]} 
                onPress={() => {
                  const nav = typeof navigator !== 'undefined' ? navigator : null;
                  if (nav && nav.share && invoiceImageUrl) {
                    fetch(invoiceImageUrl)
                      .then(res => res.blob())
                      .then(blob => {
                        const file = new File([blob], `Invoice-${sharingShopName}-${sharingDate}.png`, { type: 'image/png' });
                        if (nav.canShare && nav.canShare({ files: [file] })) {
                          nav.share({
                            files: [file],
                            title: `Invoice for ${sharingShopName}`,
                            text: `Here is the invoice for ${sharingShopName} on ${sharingDate}.`
                          }).catch(err => console.log('Share failed', err));
                        }
                      });
                  } else {
                    alert(language === 'mr' ? 'शेअर करणे उपलब्ध नाही' : 'Sharing is not supported on this browser');
                  }
                }}
              >
                <Text style={styles.modalBtnText}>{language === 'mr' ? 'शेअर करा' : 'Share'}</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.modalBtn, { backgroundColor: '#757575' }]} 
                onPress={() => setInvoiceModalVisible(false)}
              >
                <Text style={styles.modalBtnText}>{language === 'mr' ? 'बंद करा' : 'Close'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Drawer rendering */}
      {renderDrawer()}
      <StatusBar style="light" />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeContainer: {
    flex: 1,
    backgroundColor: Theme.colors.background,
  },
  container: {
    flex: 1,
    backgroundColor: Theme.colors.background,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 56,
    paddingHorizontal: Theme.spacing.gutter,
    borderBottomWidth: 1,
    borderBottomColor: Theme.colors.border,
    backgroundColor: Theme.colors.background,
  },
  topBarButton: {
    padding: Theme.spacing.base,
    borderRadius: Theme.radius.button,
  },
  topBarTitle: {
    ...Theme.typography.bodyLg,
    fontWeight: '600',
    color: Theme.colors.primaryText,
  },
  homeTabContainer: {
    flex: 1,
    position: 'relative',
    backgroundColor: Theme.colors.background,
  },
  floatingInputWrapper: {
    position: 'absolute',
    bottom: Theme.spacing.md,
    left: Theme.spacing.marginMobile,
    right: Theme.spacing.marginMobile,
    alignItems: 'center',
  },
  inputPill: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    maxWidth: 720,
    minHeight: 48,
    backgroundColor: Theme.colors.surface,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    borderRadius: Theme.radius.button,
    paddingHorizontal: Theme.spacing.gutter,
    paddingVertical: Theme.spacing.xs,
  },
  inputPillAction: {
    marginRight: Theme.spacing.base,
  },
  pillTextInput: {
    flex: 1,
    ...Theme.typography.bodyMd,
    color: Theme.colors.primaryText,
    paddingVertical: Theme.spacing.xs,
  },
  pillSendBtn: {
    padding: Theme.spacing.base,
    backgroundColor: 'transparent',
  },
  pillMicBtn: {
    padding: Theme.spacing.base,
    borderRadius: Theme.radius.button,
  },
  pillMicBtnActive: {
    backgroundColor: Theme.colors.accent,
  },
  drawerBackdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: '#000000',
  },
  drawerPanel: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 300,
    backgroundColor: '#000000',
    borderRightWidth: 1,
    borderRightColor: Theme.colors.border,
    paddingTop: Platform.OS === 'ios' ? 40 : 20,
    zIndex: 100,
  },
  drawerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Theme.spacing.marginMobile,
    paddingVertical: Theme.spacing.sm,
  },
  drawerTitle: {
    ...Theme.typography.headlineLgMobile,
    fontWeight: '900',
    color: Theme.colors.primaryText,
    letterSpacing: -0.5,
  },
  drawerCloseBtn: {
    padding: Theme.spacing.xs,
  },
  newChatBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Theme.colors.surfaceElevated,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    borderRadius: Theme.radius.card,
    marginHorizontal: Theme.spacing.marginMobile,
    marginVertical: Theme.spacing.sm,
    paddingHorizontal: Theme.spacing.gutter,
    paddingVertical: Theme.spacing.sm,
  },
  newChatBtnText: {
    ...Theme.typography.bodyMd,
    fontWeight: '600',
    color: Theme.colors.primaryText,
  },
  drawerScroll: {
    flex: 1,
  },
  drawerScrollContent: {
    paddingHorizontal: Theme.spacing.marginMobile,
    paddingBottom: Theme.spacing.md,
  },
  drawerSectionHeader: {
    ...Theme.typography.labelSm,
    color: Theme.colors.mutedText,
    textTransform: 'uppercase',
    marginTop: Theme.spacing.md,
    marginBottom: Theme.spacing.xs,
    paddingHorizontal: Theme.spacing.xs,
  },
  drawerNavItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Theme.spacing.sm,
    paddingHorizontal: Theme.spacing.sm,
    borderRadius: Theme.radius.card / 2,
    marginVertical: Theme.spacing.xs,
  },
  drawerNavItemActive: {
    backgroundColor: Theme.colors.surface,
  },
  drawerNavText: {
    ...Theme.typography.bodyMd,
    color: Theme.colors.secondaryText,
    marginLeft: Theme.spacing.sm,
  },
  drawerNavTextActive: {
    color: Theme.colors.primaryText,
    fontWeight: '600',
  },
  drawerDivider: {
    height: 1,
    backgroundColor: Theme.colors.border,
    marginVertical: Theme.spacing.md,
    marginHorizontal: Theme.spacing.xs,
  },
  drawerShopCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Theme.colors.surface,
    borderWidth: 1.5,
    borderColor: 'transparent',
    borderRadius: Theme.radius.card,
    padding: Theme.spacing.sm,
    marginVertical: Theme.spacing.xs,
  },
  drawerShopCardSelected: {
    borderColor: Theme.colors.accent,
    backgroundColor: '#0c1b2f',
  },
  drawerShopCardText: {
    ...Theme.typography.bodyMd,
    color: Theme.colors.secondaryText,
    marginLeft: Theme.spacing.sm,
    flex: 1,
  },
  drawerShopCardTextSelected: {
    color: Theme.colors.primaryText,
    fontWeight: '600',
  },
  drawerFooter: {
    borderTopWidth: 1,
    borderTopColor: Theme.colors.border,
    paddingHorizontal: Theme.spacing.marginMobile,
    paddingVertical: Theme.spacing.sm,
    backgroundColor: '#000000',
  },
  drawerFooterLink: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Theme.spacing.sm,
    paddingHorizontal: Theme.spacing.xs,
    borderRadius: Theme.radius.button,
  },
  drawerFooterLinkText: {
    ...Theme.typography.bodyMd,
    color: Theme.colors.secondaryText,
    marginLeft: Theme.spacing.sm,
    fontWeight: '500',
  },
  onboardContainer: {
    flex: 1,
    backgroundColor: '#1a237e',
    justifyContent: 'center',
    alignItems: 'center',
  },
  onboardCard: {
    width: '90%',
    maxWidth: 450,
    backgroundColor: '#white',
    borderRadius: 24,
    padding: 24,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  onboardTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1a237e',
    textAlign: 'center',
    marginBottom: 24,
  },
  labelSection: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#555',
    marginTop: 16,
    marginBottom: 8,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 4,
  },
  toggleBtn: {
    flex: 1,
    backgroundColor: '#eee',
    borderRadius: 12,
    paddingVertical: 12,
    marginHorizontal: 4,
    alignItems: 'center',
  },
  activeBtn: {
    backgroundColor: '#283593',
  },
  btnText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  roleSelectCard: {
    backgroundColor: '#eee',
    borderRadius: 12,
    padding: 16,
    marginVertical: 8,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  activeRoleCard: {
    borderColor: '#283593',
    backgroundColor: '#e8eaf6',
  },
  roleCardText: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#333',
  },
  startBtn: {
    backgroundColor: '#2e7d32',
    borderRadius: 16,
    paddingVertical: 16,
    marginTop: 32,
    alignItems: 'center',
  },
  startBtnText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingTop: 50,
    paddingBottom: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1a237e',
  },
  headerSubtitle: {
    fontSize: 11,
    color: '#757575',
  },
  headerBadgeContainer: {
    backgroundColor: '#e8eaf6',
    borderRadius: 8,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#283593',
  },
  content: {
    flex: 1,
  },
  tabContent: {
    padding: 20,
  },
  simulatedTimeWidget: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#e8eaf6',
  },
  simTimeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  simTimeLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#555',
  },
  simTimeClock: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1a237e',
  },
  warpBtn: {
    flex: 1,
    backgroundColor: '#e3f2fd',
    borderRadius: 10,
    paddingVertical: 10,
    marginHorizontal: 4,
    alignItems: 'center',
  },
  warpBtnText: {
    color: '#1565c0',
    fontSize: 13,
    fontWeight: 'bold',
  },
  triggerCallBtn: {
    flex: 1,
    backgroundColor: '#e8f5e9',
    borderRadius: 10,
    paddingVertical: 10,
    marginHorizontal: 4,
    marginTop: 8,
    alignItems: 'center',
  },
  triggerCallBtnText: {
    color: '#2e7d32',
    fontSize: 11,
    fontWeight: 'bold',
  },
  retryBanner: {
    backgroundColor: '#fff3e0',
    borderRadius: 8,
    padding: 8,
    marginTop: 12,
    alignItems: 'center',
  },
  retryBannerText: {
    color: '#e65100',
    fontSize: 12,
    fontWeight: 'bold',
  },
  chatContainer: {
    paddingVertical: Theme.spacing.md,
    width: '100%',
  },
  chatMessageRow: {
    marginVertical: Theme.spacing.md,
    width: '100%',
  },
  chatRowUser: {
    alignItems: 'flex-end',
  },
  chatRowAssistant: {
    alignItems: 'flex-start',
  },
  userMessagePill: {
    backgroundColor: Theme.colors.surfaceElevated,
    borderRadius: 24,
    paddingVertical: 10,
    paddingHorizontal: 16,
    maxWidth: '90%',
  },
  userMessageText: {
    ...Theme.typography.bodyMd,
    color: Theme.colors.primaryText,
    lineHeight: 20,
  },
  assistantMessageContainer: {
    maxWidth: '90%',
    paddingHorizontal: Theme.spacing.xs,
  },
  assistantMessageText: {
    ...Theme.typography.bodyMd,
    color: Theme.colors.primaryText,
    lineHeight: 22,
  },
  typingIndicatorText: {
    ...Theme.typography.bodyMd,
    color: Theme.colors.mutedText,
    fontStyle: 'italic',
  },
  voiceControlsContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 15,
  },
  micBigButton: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#1a237e',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#1a237e',
    shadowOpacity: 0.3,
    shadowRadius: 15,
    shadowOffset: { width: 0, height: 8 },
  },
  micListeningActive: {
    backgroundColor: '#c62828',
    shadowColor: '#c62828',
  },
  micIconText: {
    fontSize: 40,
  },
  micButtonSubtext: {
    color: '#fff',
    fontSize: 11,
    marginTop: 6,
    fontWeight: 'bold',
  },
  fullWidthCallBtn: {
    backgroundColor: '#2e7d32',
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: '#2e7d32',
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
  fullWidthCallBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  keyboardInputRow: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    alignItems: 'center',
  },
  textInput: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
  },
  sendBtn: {
    backgroundColor: '#1a237e',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  sendBtnText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1a237e',
    marginBottom: 20,
  },
  dateSelectorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  dateLabel: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#555',
    marginRight: 10,
  },
  dateInput: {
    flex: 1,
    fontSize: 15,
    fontWeight: 'bold',
    color: '#1a237e',
  },
  ledgerShopCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#e8eaf6',
  },
  ledgerShopHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    paddingBottom: 10,
    marginBottom: 10,
  },
  ledgerShopName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  ledgerShopBalance: {
    backgroundColor: '#fff3e0',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  balanceText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#e65100',
  },
  ledgerStatusIndicator: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  statusBadge: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#555',
  },
  totalBillText: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#2e7d32',
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#f5f7fb',
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderRadius: 6,
  },
  th: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#757575',
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 12,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    alignItems: 'center',
  },
  td: {
    fontSize: 13,
    color: '#333',
  },
  editRowBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: 13,
    color: '#9e9e9e',
    textAlign: 'center',
    marginVertical: 12,
  },
  approvalCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e8eaf6',
  },
  approvalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  approvalTypeBadge: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#1a237e',
    backgroundColor: '#e8eaf6',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  approvalTime: {
    fontSize: 11,
    color: '#757575',
  },
  approvalBody: {
    marginBottom: 16,
  },
  approvalDetails: {
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
  },
  approvalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  approvalBtn: {
    flex: 1,
    paddingVertical: 12,
    marginHorizontal: 4,
    borderRadius: 10,
    alignItems: 'center',
  },
  approvalBtnText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 13,
  },
  settingsGroup: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#e8eaf6',
  },
  settingsLabel: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  toggleBtnWide: {
    backgroundColor: '#e8eaf6',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  toggleBtnWideText: {
    color: '#283593',
    fontWeight: 'bold',
  },
  listItem: {
    fontSize: 13,
    color: '#555',
    marginVertical: 4,
  },
  itemsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  itemTag: {
    backgroundColor: '#f5f7fb',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    margin: 4,
  },
  itemTagText: {
    fontSize: 12,
    color: '#333',
    fontWeight: '500',
  },
  resetBtn: {
    borderColor: '#c62828',
    borderWidth: 1.5,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 40,
  },
  resetBtnText: {
    color: '#c62828',
    fontWeight: 'bold',
  },
  generateInvoiceBtn: {
    backgroundColor: '#1b4332',
    borderRadius: 10,
    paddingVertical: 12,
    marginTop: 15,
    alignItems: 'center',
  },
  generateInvoiceBtnText: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '90%',
    maxWidth: 400,
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1a237e',
    marginBottom: 16,
    textAlign: 'center',
  },
  modalLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#555',
    marginTop: 10,
    marginBottom: 4,
  },
  modalInput: {
    backgroundColor: '#f5f7fb',
    borderRadius: 8,
    padding: 10,
    fontSize: 15,
    color: '#333',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  modalBtn: {
    flex: 1,
    paddingVertical: 12,
    marginHorizontal: 6,
    borderRadius: 8,
    alignItems: 'center',
  },
  modalBtnText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  navigation: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    paddingVertical: 8,
  },
  navTab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeTab: {
    opacity: 1,
  },
  navIcon: {
    fontSize: 20,
    marginBottom: 2,
  },
  navText: {
    fontSize: 10,
    color: '#757575',
    fontWeight: 'bold',
  },

  // Call overlay styles
  ringingOverlay: {
    flex: 1,
    backgroundColor: '#0d1b2a',
    justifyContent: 'center',
    alignItems: 'center',
  },
  ringingCard: {
    width: '85%',
    maxWidth: 350,
    alignItems: 'center',
  },
  ringingStatusLabel: {
    fontSize: 16,
    color: '#a0c4ff',
    fontWeight: 'bold',
    marginBottom: 16,
  },
  ringingCallerName: {
    fontSize: 26,
    color: '#fff',
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 40,
  },
  ringingPulsar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#1b4332',
    opacity: 0.6,
    marginBottom: 60,
  },
  ringingActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
  },
  acceptCallBtn: {
    backgroundColor: '#2d6a4f',
    paddingVertical: 16,
    paddingHorizontal: 28,
    borderRadius: 30,
  },
  declineCallBtn: {
    backgroundColor: '#b7094c',
    paddingVertical: 16,
    paddingHorizontal: 28,
    borderRadius: 30,
  },
  callActionText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: 'bold',
  },
  activeCallOverlay: {
    flex: 1,
    backgroundColor: '#111b27',
    paddingHorizontal: 24,
    paddingTop: 80,
    paddingBottom: 60,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  activeCallTitle: {
    fontSize: 22,
    color: '#fff',
    fontWeight: 'bold',
    textAlign: 'center',
  },
  activeCallTimer: {
    fontSize: 16,
    color: '#72efdd',
    fontWeight: 'bold',
    marginTop: 8,
  },
  waveformContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 100,
  },
  waveBar: {
    width: 8,
    backgroundColor: '#72efdd',
    marginHorizontal: 4,
    borderRadius: 4,
  },
  callUtteranceBox: {
    backgroundColor: '#1d2d44',
    borderRadius: 16,
    padding: 20,
    width: '100%',
  },
  callUtteranceText: {
    color: '#fff',
    fontSize: 16,
    lineHeight: 24,
    textAlign: 'center',
  },
  callInputRow: {
    flexDirection: 'row',
    backgroundColor: '#1d2d44',
    borderRadius: 12,
    padding: 6,
    alignItems: 'center',
    width: '100%',
  },
  callTextInput: {
    flex: 1,
    color: '#fff',
    paddingHorizontal: 12,
    fontSize: 15,
  },
  callSendBtn: {
    backgroundColor: '#72efdd',
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  callSendBtnText: {
    fontSize: 18,
  },
  quickCallAnswersRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    width: '100%',
    marginVertical: 10,
  },
  quickAnswerBtn: {
    backgroundColor: '#3e5c76',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 20,
    marginHorizontal: 8,
  },
  quickAnswerBtnText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '500',
  },
  hangupBtn: {
    backgroundColor: '#b7094c',
    paddingVertical: 16,
    paddingHorizontal: 40,
    borderRadius: 30,
    shadowColor: '#b7094c',
    shadowOpacity: 0.4,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  hangupBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  callStatusIndicatorBox: {
    marginTop: 20,
    marginBottom: 40,
    padding: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    paddingHorizontal: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  callStatusIndicatorText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  missedCallOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  missedCallText: {
    fontSize: 18,
    color: '#ff4d4f',
    fontWeight: 'bold',
    backgroundColor: '#fff',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    textAlign: 'center',
  },
});
