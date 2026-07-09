import React, { useState, useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Modal,
} from 'react-native';
import * as db from './services/db';
import { processVoiceInput } from './services/gemini';
import { startContinuousListening, synthesizeSpeech } from './services/voice';

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
    callBtn: "Morning/Night Call",
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
    callBtn: "सकाळ/रात्र कॉल",
    quickNoteTitle: "क्विक व्हॉइस नोट",
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
  }
};

export default function App() {
  // Onboarding Settings
  const [hasOnboarded, setHasOnboarded] = useState(false);
  const [language, setLanguage] = useState<'en' | 'mr'>('en');
  const [role, setRole] = useState<'admin' | 'normal'>('admin');

  // Navigation
  const [currentTab, setCurrentTab] = useState<'home' | 'ledger' | 'approvals' | 'settings'>('home');

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
  const [editingEntry, setEditingEntry] = useState<{
    shopId: string;
    date: string;
    itemId: string;
    itemName: string;
    quantity: number;
    unitPrice: number | null;
  } | null>(null);

  // Settings inputs
  const [newShopName, setNewShopName] = useState('');
  const [newItemName, setNewItemName] = useState('');

  // Loaded database lists
  const [shops, setShops] = useState<db.Shop[]>([]);
  const [items, setItems] = useState<db.CanonicalItem[]>([]);
  const [pendingApprovals, setPendingApprovals] = useState<db.PendingApproval[]>([]);

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

  // Quick Voice Note activation
  const handleMicPress = () => {
    if (isListening) {
      setIsListening(false);
      return;
    }

    setRecognizedText('');
    setIsListening(true);

    const recognition = startContinuousListening(
      async (resultText) => {
        setIsListening(false);
        setRecognizedText(resultText);
        await submitTextInput(resultText);
      },
      (errorMsg) => {
        setIsListening(false);
        console.error("Speech Error: ", errorMsg);
      },
      language
    );

    // Auto-stop listening after 6 seconds if no results (fallback)
    setTimeout(() => {
      if (isListening) {
        setIsListening(false);
        recognition.stop();
      }
    }, 6000);
  };

  // Submit Text/Voice Command to AI
  const submitTextInput = async (inputStr: string) => {
    if (!inputStr.trim()) return;
    setIsProcessing(true);
    setAiSpeechOutput('');

    try {
      const result = await processVoiceInput(inputStr, role, language);
      setAiSpeechOutput(result.responseText);
      
      // Speak the response using Speech Synthesis
      synthesizeSpeech(result.responseText, language);
      
      refreshData();
    } catch (e) {
      console.error(e);
    } finally {
      setIsProcessing(false);
      setTextCommand('');
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
    
    // Find ledger
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

        // Recalculate totals if locked
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

  // Reset database helper
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

  // Render Onboarding / Initial Setup Screen
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

  return (
    <View style={styles.container}>
      {/* Header bar */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>{t.appTitle}</Text>
          <Text style={styles.headerSubtitle}>{t.syncStatus}</Text>
        </View>
        <View style={styles.headerBadgeContainer}>
          <Text style={styles.badgeText}>
            {role === 'admin' ? "👑 Admin" : "👤 Driver"} | {language === 'en' ? "EN" : "मराठी"}
          </Text>
        </View>
      </View>

      {/* Main Tab Views */}
      <View style={styles.content}>
        {currentTab === 'home' && (
          <ScrollView contentContainerStyle={styles.tabContent}>
            {/* Dynamic AI Status box */}
            <View style={styles.aiStatusBox}>
              <Text style={styles.voicePromptText}>
                {isListening ? t.micListening : isProcessing ? t.micProcessing : t.micTapToSpeak}
              </Text>
              
              {recognizedText ? (
                <Text style={styles.recognizedText}>" {recognizedText} "</Text>
              ) : null}

              {aiSpeechOutput ? (
                <View style={styles.speechBubble}>
                  <Text style={styles.aiSpeechText}>🔊 {aiSpeechOutput}</Text>
                </View>
              ) : null}
            </View>

            {/* Mic and Call controls */}
            <View style={styles.voiceControlsContainer}>
              <TouchableOpacity
                style={[styles.micBigButton, isListening && styles.micListeningActive]}
                onPress={handleMicPress}
              >
                <Text style={styles.micIconText}>{isListening ? "⏹️" : "🎙️"}</Text>
                <Text style={styles.micButtonSubtext}>{t.quickNoteTitle}</Text>
              </TouchableOpacity>
            </View>

            {/* Fallback Keyboard Input for Testing/Conversations */}
            <View style={styles.keyboardInputRow}>
              <TextInput
                style={styles.textInput}
                value={textCommand}
                onChangeText={setTextCommand}
                placeholder={t.voiceCommandPlaceholder}
                onSubmitEditing={() => submitTextInput(textCommand)}
              />
              <TouchableOpacity style={styles.sendBtn} onPress={() => submitTextInput(textCommand)}>
                <Text style={styles.sendBtnText}>{t.sendBtn}</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
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

      {/* Navigation tabs */}
      <View style={styles.navigation}>
        <TouchableOpacity
          style={[styles.navTab, currentTab === 'home' && styles.activeTab]}
          onPress={() => { setCurrentTab('home'); refreshData(); }}
        >
          <Text style={styles.navIcon}>🎙️</Text>
          <Text style={styles.navText}>{t.tabHome}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.navTab, currentTab === 'ledger' && styles.activeTab]}
          onPress={() => { setCurrentTab('ledger'); refreshData(); }}
        >
          <Text style={styles.navIcon}>📝</Text>
          <Text style={styles.navText}>{t.tabLedger}</Text>
        </TouchableOpacity>

        {role === 'admin' && (
          <TouchableOpacity
            style={[styles.navTab, currentTab === 'approvals' && styles.activeTab]}
            onPress={() => { setCurrentTab('approvals'); refreshData(); }}
          >
            <Text style={styles.navIcon}>👥</Text>
            <Text style={styles.navText}>{t.tabApprovals}</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={[styles.navTab, currentTab === 'settings' && styles.activeTab]}
          onPress={() => { setCurrentTab('settings'); refreshData(); }}
        >
          <Text style={styles.navIcon}>⚙️</Text>
          <Text style={styles.navText}>{t.tabSettings}</Text>
        </TouchableOpacity>
      </View>
      <StatusBar style="dark" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f7fb',
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
    backgroundColor: '#fff',
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
  aiStatusBox: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#e8eaf6',
    alignItems: 'center',
  },
  voicePromptText: {
    fontSize: 16,
    color: '#555',
    textAlign: 'center',
    marginBottom: 12,
  },
  recognizedText: {
    fontSize: 16,
    fontStyle: 'italic',
    color: '#283593',
    textAlign: 'center',
    marginBottom: 12,
    fontWeight: '500',
  },
  speechBubble: {
    backgroundColor: '#e8eaf6',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginTop: 8,
    width: '100%',
  },
  aiSpeechText: {
    fontSize: 15,
    color: '#1a237e',
    lineHeight: 22,
  },
  voiceControlsContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 30,
  },
  micBigButton: {
    width: 140,
    height: 140,
    borderRadius: 70,
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
    fontSize: 50,
  },
  micButtonSubtext: {
    color: '#fff',
    fontSize: 12,
    marginTop: 8,
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
});
