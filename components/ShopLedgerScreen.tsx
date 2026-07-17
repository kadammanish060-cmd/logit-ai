import React, { useState, useMemo, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Modal,
  Alert,
  Platform,
  Dimensions,
} from 'react-native';
import {
  ArrowLeft,
  Search,
  Plus,
  Mic,
  Camera,
  FileText,
  User,
  List as ListIcon,
  Table as TableIcon,
  X,
  Volume2,
  Calendar,
  Save,
} from 'lucide-react-native';
import * as db from '../services/db';
import { CameraService } from '../services/CameraService';

const { width, height } = Dimensions.get('window');

interface ShopLedgerScreenProps {
  shopId: string;
  onBack: () => void;
  colors: any;
}

// ----------------------------------------------------
// UI Badges Components
// ----------------------------------------------------
export const VoiceBadge = () => (
  <View style={styles.badgeVoice}>
    <Mic size={10} color="#3B82F6" style={{ marginRight: 2 }} />
    <Text style={styles.badgeVoiceText}>Voice</Text>
  </View>
);

export const ManualBadge = () => (
  <View style={styles.badgeManual}>
    <Text style={styles.badgeManualText}>✍ Manual</Text>
  </View>
);

export const ReceiptBadge = () => (
  <View style={styles.badgeReceipt}>
    <FileText size={10} color="#10B981" style={{ marginRight: 2 }} />
    <Text style={styles.badgeReceiptText}>Receipt</Text>
  </View>
);

export const TransactionTypeBadge = ({ type }: { type: 'purchase' | 'payment' }) => {
  const isPurchase = type === 'purchase';
  return (
    <View style={[styles.typeBadge, isPurchase ? styles.typeBadgePurchase : styles.typeBadgePayment]}>
      <Text style={[styles.typeBadgeText, isPurchase ? styles.typeBadgePurchaseText : styles.typeBadgePaymentText]}>
        {isPurchase ? 'Purchase' : 'Received'}
      </Text>
    </View>
  );
};

// ----------------------------------------------------
// Sub-component: Summary Card
// ----------------------------------------------------
interface SummaryCardProps {
  shopName: string;
  balance: number;
  txCount: number;
  lastUpdated: string;
  colors: any;
}

export const LedgerSummaryCard: React.FC<SummaryCardProps> = ({
  shopName,
  balance,
  txCount,
  lastUpdated,
  colors,
}) => {
  return (
    <View style={styles.summaryCard}>
      <Text style={styles.summaryShopName}>{shopName}</Text>
      <Text style={styles.summaryLabel}>Outstanding Balance</Text>
      <Text style={styles.summaryBalance}>₹{balance.toLocaleString('en-IN')}</Text>
      
      <View style={styles.summaryFooter}>
        <View>
          <Text style={styles.summaryFooterLabel}>Transactions</Text>
          <Text style={styles.summaryFooterValue}>{txCount}</Text>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={styles.summaryFooterLabel}>Last Updated</Text>
          <Text style={styles.summaryFooterValue}>{lastUpdated}</Text>
        </View>
      </View>
    </View>
  );
};

// ----------------------------------------------------
// Sub-component: Filter Bar
// ----------------------------------------------------
type FilterType = 'all' | 'today' | 'week' | 'month';

interface FilterBarProps {
  selectedFilter: FilterType;
  onChangeFilter: (filter: FilterType) => void;
  colors: any;
}

export const LedgerFilterBar: React.FC<FilterBarProps> = ({
  selectedFilter,
  onChangeFilter,
  colors,
}) => {
  const filters: { key: FilterType; label: string }[] = [
    { key: 'today', label: 'Today' },
    { key: 'week', label: 'Week' },
    { key: 'month', label: 'Month' },
    { key: 'all', label: 'All' },
  ];

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.filterBarContainer}
      contentContainerStyle={styles.filterBarContent}
    >
      {filters.map((f) => {
        const isActive = selectedFilter === f.key;
        return (
          <TouchableOpacity
            key={f.key}
            style={[
              styles.filterChip,
              isActive ? styles.filterChipActive : styles.filterChipInactive,
            ]}
            onPress={() => onChangeFilter(f.key)}
            activeOpacity={0.8}
          >
            <Text
              style={[
                styles.filterChipText,
                isActive ? styles.filterChipTextActive : styles.filterChipTextInactive,
              ]}
            >
              {f.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
};

// ----------------------------------------------------
// Sub-component: Empty State
// ----------------------------------------------------
export const LedgerEmptyState = () => {
  return (
    <View style={styles.emptyStateContainer}>
      <Text style={styles.emptyStateEmoji}>📒</Text>
      <Text style={styles.emptyStateTitle}>No transactions yet</Text>
      <Text style={styles.emptyStateSubtitle}>
        Use the microphone or scan a receipt to create your first entry.
      </Text>
    </View>
  );
};

// ----------------------------------------------------
// Sub-component: Transaction Row
// ----------------------------------------------------
interface TransactionRowProps {
  item: any;
  onPress: () => void;
  colors: any;
}

export const LedgerTransactionRow: React.FC<TransactionRowProps> = ({ item, onPress, colors }) => {
  const getEmoji = (name: string, type: 'purchase' | 'payment') => {
    if (type === 'payment') return '💵';
    const n = name.toLowerCase();
    if (n.includes('onion') || n.includes('कांदा')) return '🧅';
    if (n.includes('tomato') || n.includes('टोमॅटो')) return '🍅';
    if (n.includes('potato') || n.includes('बटाटा')) return '🥔';
    if (n.includes('lemon') || n.includes('लिंबू')) return '🍋';
    if (n.includes('chilli') || n.includes('मिरची')) return '🌶️';
    if (n.includes('ginger') || n.includes('आलं')) return '🫚';
    if (n.includes('garlic') || n.includes('लसूण')) return '🧄';
    return '📦';
  };

  const getFormattedTime = (timestamp: string) => {
    try {
      const d = new Date(timestamp);
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  };

  return (
    <TouchableOpacity style={styles.rowWrapper} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.rowLeft}>
        <View style={styles.rowEmojiContainer}>
          <Text style={styles.rowEmoji}>{getEmoji(item.name, item.type)}</Text>
        </View>
        <View style={styles.rowMeta}>
          <Text style={styles.rowName}>{item.name}</Text>
          <View style={styles.rowSub}>
            <Text style={styles.rowTime}>{getFormattedTime(item.timestamp)}</Text>
            <View style={{ width: 8 }} />
            {item.source === 'voice' && <VoiceBadge />}
            {item.source === 'manual' && <ManualBadge />}
            {item.source === 'ocr' && <ReceiptBadge />}
          </View>
        </View>
      </View>
      <View style={styles.rowRight}>
        <Text style={[styles.rowAmount, item.type === 'purchase' ? styles.rowAmountDebit : styles.rowAmountCredit]}>
          {item.type === 'purchase' ? '-' : '+'}₹{item.amount || item.lineTotal || 0}
        </Text>
        {item.type === 'purchase' && item.quantity !== undefined && (
          <Text style={styles.rowQty}>{item.quantity} kg</Text>
        )}
      </View>
    </TouchableOpacity>
  );
};

// ----------------------------------------------------
// Main Component Screen
// ----------------------------------------------------
export const ShopLedgerScreen: React.FC<ShopLedgerScreenProps> = ({
  shopId,
  onBack,
  colors,
}) => {
  const [filter, setFilter] = useState<FilterType>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'table'>('list');

  // FAB States
  const [isFABOpen, setIsFABOpen] = useState(false);

  // Modal / Entry States
  const [manualEntryModal, setManualEntryModal] = useState(false);
  const [entryType, setEntryType] = useState<'purchase' | 'payment'>('purchase');
  const [manualItemName, setManualItemName] = useState('');
  const [manualQty, setManualQty] = useState('');
  const [manualRate, setManualRate] = useState('');
  const [manualAmount, setManualAmount] = useState('');
  const [manualNotes, setManualNotes] = useState('');
  const [attachedImage, setAttachedImage] = useState<string | null>(null);

  // Voice recording simulation states
  const [voiceModalVisible, setVoiceModalVisible] = useState(false);
  const [isVoiceRecording, setIsVoiceRecording] = useState(false);
  const [voiceTimer, setVoiceTimer] = useState(0);

  // Detail / Bottom Sheet States
  const [detailSheetVisible, setDetailSheetVisible] = useState(false);
  const [selectedTx, setSelectedTx] = useState<any>(null);
  const [isEditingTx, setIsEditingTx] = useState(false);

  // DB Sync
  const [shop, setShop] = useState<any>(null);
  const [dbVersion, setDbVersion] = useState(0); // Simple trigger to force re-fetches

  useEffect(() => {
    const activeShop = db.getShops().find((s) => s.id === shopId);
    setShop(activeShop || null);
  }, [shopId, dbVersion]);

  // Fetch and unify transactions
  const transactions = useMemo(() => {
    if (!shop) return [];
    const ledgers = db.getLedgersForShop(shop.id);
    const payments = db.getPaymentsForShop(shop.id);
    const list: any[] = [];

    // Deliveries
    Object.entries(ledgers).forEach(([date, ledger]: [string, any]) => {
      Object.values(ledger.items).forEach((item: any) => {
        list.push({
          id: item.id + '_' + date,
          rawId: item.id,
          date,
          type: 'purchase',
          name: item.itemName,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          amount: item.lineTotal,
          timestamp: item.deliveredAt,
          status: item.status,
          source: item.source || 'voice',
          transcript: item.transcript,
          notes: item.notes,
          receiptUrl: item.receiptUrl,
          createdBy: ledger.createdBy === 'admin' ? 'Admin' : 'Staff',
        });
      });
    });

    // Payments
    Object.values(payments).forEach((pay: any) => {
      const payDate = pay.paidAt.split('T')[0];
      list.push({
        id: pay.id,
        rawId: pay.id,
        date: payDate,
        type: 'payment',
        name: 'Cash Payment',
        amount: pay.amount,
        timestamp: pay.paidAt,
        status: pay.status,
        source: pay.source || 'manual',
        notes: pay.notes,
        receiptUrl: pay.receiptUrl,
        createdBy: pay.loggedBy === 'admin' ? 'Admin' : 'Staff',
      });
    });

    // Sort descending by timestamp
    return list.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [shop, dbVersion]);

  // Apply filters and search queries
  const filteredTransactions = useMemo(() => {
    let list = [...transactions];

    // Filter by Date chips
    const todayStr = new Date().toISOString().split('T')[0];
    if (filter === 'today') {
      list = list.filter((tx) => tx.date === todayStr);
    } else if (filter === 'week') {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      list = list.filter((tx) => new Date(tx.timestamp).getTime() >= sevenDaysAgo.getTime());
    } else if (filter === 'month') {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      list = list.filter((tx) => new Date(tx.timestamp).getTime() >= thirtyDaysAgo.getTime());
    }

    // Filter by Search Query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      list = list.filter((tx) => {
        return (
          tx.name.toLowerCase().includes(query) ||
          tx.amount?.toString().includes(query) ||
          tx.notes?.toLowerCase().includes(query) ||
          tx.createdBy?.toLowerCase().includes(query) ||
          tx.date.includes(query)
        );
      });
    }

    return list;
  }, [transactions, filter, searchQuery]);

  // Compute table entries (needs running balance calculated oldest-to-newest)
  const tableTransactions = useMemo(() => {
    // Sort oldest first to calculate running balance
    const sortedOldest = [...filteredTransactions].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    let bal = 0;
    return sortedOldest.map((tx) => {
      if (tx.type === 'purchase') {
        bal += (tx.amount || 0);
      } else {
        bal -= (tx.amount || 0);
      }
      return { ...tx, runningBalance: bal };
    }).reverse(); // Sort descending for display
  }, [filteredTransactions]);

  // Group transactions by date for the list view
  const groupedTransactions = useMemo(() => {
    const groups: { [title: string]: any[] } = {};
    const todayStr = new Date().toISOString().split('T')[0];
    
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    filteredTransactions.forEach((tx) => {
      let groupTitle = tx.date;
      if (tx.date === todayStr) {
        groupTitle = 'Today';
      } else if (tx.date === yesterdayStr) {
        groupTitle = 'Yesterday';
      } else {
        // Format as D MMMM
        try {
          const d = new Date(tx.date);
          groupTitle = d.toLocaleDateString('en-US', { day: 'numeric', month: 'long' });
        } catch {}
      }

      if (!groups[groupTitle]) {
        groups[groupTitle] = [];
      }
      groups[groupTitle].push(tx);
    });

    return Object.entries(groups);
  }, [filteredTransactions]);

  // Get last updated status
  const lastUpdated = useMemo(() => {
    const firstTx = transactions[0];
    if (!firstTx) return 'Never';
    const todayStr = new Date().toISOString().split('T')[0];
    return firstTx.date === todayStr ? 'Today' : firstTx.date;
  }, [transactions]);

  // Handle manual saving
  const handleSaveManualEntry = () => {
    if (!shop) return;
    if (entryType === 'purchase') {
      if (!manualItemName.trim()) {
        Alert.alert('Error', 'Please enter item name');
        return;
      }
      const qty = parseFloat(manualQty);
      if (isNaN(qty) || qty <= 0) {
        Alert.alert('Error', 'Please enter a valid quantity');
        return;
      }
      const rate = parseFloat(manualRate);
      const isPriced = !isNaN(rate) && rate > 0;
      
      const todayStr = new Date().toISOString().split('T')[0];
      
      // Log Delivery
      db.logDelivery(
        shop.name,
        manualItemName,
        qty,
        todayStr,
        'admin',
        attachedImage ? 'ocr' : 'manual',
        undefined,
        manualNotes,
        attachedImage || undefined
      );

      // If price was supplied, set it immediately
      if (isPriced) {
        db.setPrice(shop.name, todayStr, manualItemName, rate);
      }
    } else {
      const amt = parseFloat(manualAmount);
      if (isNaN(amt) || amt <= 0) {
        Alert.alert('Error', 'Please enter a valid amount');
        return;
      }
      // Log Payment
      db.logPayment(
        shop.name,
        amt,
        'admin',
        'manual',
        manualNotes
      );
    }

    setManualItemName('');
    setManualQty('');
    setManualRate('');
    setManualAmount('');
    setManualNotes('');
    setAttachedImage(null);
    setManualEntryModal(false);
    setIsFABOpen(false);
    setDbVersion((v) => v + 1);
  };

  // Launch camera scanner
  const handleScanReceipt = async () => {
    try {
      const img = await CameraService.takePhoto();
      if (img) {
        setAttachedImage(img.uri);
        setEntryType('purchase');
        // Pre-fill mock data for awesome visual simulation
        setManualItemName('Onion');
        setManualQty('15');
        setManualRate('40');
        setManualNotes('Auto-extracted from scanned receipt');
        setManualEntryModal(true);
      }
    } catch (e) {
      console.warn(e);
    }
  };

  // Trigger voice simulation
  const startVoiceRecordingSimulation = () => {
    setIsVoiceRecording(true);
    setVoiceTimer(0);
    setVoiceModalVisible(true);

    const interval = setInterval(() => {
      setVoiceTimer((t) => t + 1);
    }, 1000);

    // Stop and compile after 4 seconds
    setTimeout(() => {
      clearInterval(interval);
      setIsVoiceRecording(false);
      
      // Pre-log delivery parsed mock voice entry
      const sampleTranscripts = [
        "delivered 20 kg of tomatoes to Sudamache",
        "logged delivery of 12 kg of ginger at Sudamache",
        "10 kg lemons delivered",
      ];
      const selectedText = sampleTranscripts[Math.floor(Math.random() * sampleTranscripts.length)];
      
      // Parse details mock
      let item = 'Tomato';
      let qty = 15;
      if (selectedText.includes('ginger')) {
        item = 'Ginger';
        qty = 12;
      } else if (selectedText.includes('lemon')) {
        item = 'Lemon';
        qty = 10;
      }

      db.logDelivery(
        shop.name,
        item,
        qty,
        undefined,
        'admin',
        'voice',
        selectedText,
        'Logged via quick voice recorder'
      );

      setVoiceModalVisible(false);
      setDbVersion((v) => v + 1);
      Alert.alert('Voice Logged', `Successfully logged: ${qty} kg of ${item} (parsed from: "${selectedText}")`);
    }, 4500);
  };

  // Save updates in details view
  const handleUpdateTransaction = () => {
    if (!selectedTx || !shop) return;
    const qty = parseFloat(manualQty);
    const rate = parseFloat(manualRate);
    const amt = parseFloat(manualAmount);

    if (selectedTx.type === 'purchase') {
      if (!manualItemName.trim()) {
        Alert.alert('Error', 'Please enter item name');
        return;
      }
      if (isNaN(qty) || qty <= 0) {
        Alert.alert('Error', 'Please enter a valid quantity');
        return;
      }

      db.updateLedgerItem(shop.id, selectedTx.date, selectedTx.rawId, {
        itemName: manualItemName,
        quantity: qty,
        unitPrice: isNaN(rate) ? null : rate,
        notes: manualNotes,
      });
    } else {
      if (isNaN(amt) || amt <= 0) {
        Alert.alert('Error', 'Please enter a valid amount');
        return;
      }
      db.updatePayment(shop.id, selectedTx.rawId, {
        amount: amt,
        notes: manualNotes,
      });
    }

    setDetailSheetVisible(false);
    setIsEditingTx(false);
    setSelectedTx(null);
    setDbVersion((v) => v + 1);
  };

  return (
    <View style={styles.container}>
      {/* ----------------------------------------------------
          Top Bar
          ---------------------------------------------------- */}
      <View style={styles.topBar}>
        <TouchableOpacity style={styles.topBarBtn} onPress={onBack} activeOpacity={0.7}>
          <ArrowLeft size={24} color="#FFFFFF" strokeWidth={1.5} />
        </TouchableOpacity>
        
        {isSearching ? (
          <TextInput
            style={styles.searchBarInput}
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search transactions..."
            placeholderTextColor="#71717A"
            autoFocus
          />
        ) : (
          <Text style={styles.topBarTitle}>{shop?.name || 'Ledger'}</Text>
        )}

        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <TouchableOpacity
            style={styles.topBarBtn}
            onPress={() => {
              setIsSearching(!isSearching);
              if (isSearching) setSearchQuery('');
            }}
            activeOpacity={0.7}
          >
            {isSearching ? (
              <X size={20} color="#FFFFFF" strokeWidth={1.5} />
            ) : (
              <Search size={20} color="#FFFFFF" strokeWidth={1.5} />
            )}
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.topBarBtn, { marginLeft: 4 }]}
            onPress={() => setViewMode(viewMode === 'list' ? 'table' : 'list')}
            activeOpacity={0.7}
          >
            {viewMode === 'list' ? (
              <TableIcon size={20} color="#FFFFFF" strokeWidth={1.5} />
            ) : (
              <ListIcon size={20} color="#FFFFFF" strokeWidth={1.5} />
            )}
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* ----------------------------------------------------
            Summary Card
            ---------------------------------------------------- */}
        <LedgerSummaryCard
          shopName={shop?.name || ''}
          balance={shop?.outstandingBalance || 0}
          txCount={transactions.length}
          lastUpdated={lastUpdated}
          colors={colors}
        />

        {/* ----------------------------------------------------
            Filter Bar
            ---------------------------------------------------- */}
        <LedgerFilterBar
          selectedFilter={filter}
          onChangeFilter={setFilter}
          colors={colors}
        />

        {/* ----------------------------------------------------
            List or Table rendering
            ---------------------------------------------------- */}
        {filteredTransactions.length === 0 ? (
          <LedgerEmptyState />
        ) : viewMode === 'list' ? (
          // Grouped List View
          <View style={styles.listSection}>
            {groupedTransactions.map(([dateTitle, txs]) => (
              <View key={dateTitle}>
                <Text style={styles.groupHeader}>{dateTitle}</Text>
                {txs.map((tx) => (
                  <LedgerTransactionRow
                    key={tx.id}
                    item={tx}
                    onPress={() => {
                      setSelectedTx(tx);
                      setManualItemName(tx.name);
                      setManualQty(tx.quantity?.toString() || '');
                      setManualRate(tx.unitPrice?.toString() || '');
                      setManualAmount(tx.amount?.toString() || '');
                      setManualNotes(tx.notes || '');
                      setIsEditingTx(false);
                      setDetailSheetVisible(true);
                    }}
                    colors={colors}
                  />
                ))}
              </View>
            ))}
          </View>
        ) : (
          // Table View
          <View style={styles.tableSection}>
            <View style={styles.tableHeaderRow}>
              <Text style={[styles.tableTh, { flex: 1.2 }]}>Date</Text>
              <Text style={[styles.tableTh, { flex: 2 }]}>Description</Text>
              <Text style={[styles.tableTh, { flex: 1.2, textAlign: 'right' }]}>Debit</Text>
              <Text style={[styles.tableTh, { flex: 1.2, textAlign: 'right' }]}>Credit</Text>
              <Text style={[styles.tableTh, { flex: 1.5, textAlign: 'right' }]}>Balance</Text>
            </View>
            {tableTransactions.map((tx) => (
              <TouchableOpacity
                key={tx.id}
                style={styles.tableBodyRow}
                onPress={() => {
                  setSelectedTx(tx);
                  setManualItemName(tx.name);
                  setManualQty(tx.quantity?.toString() || '');
                  setManualRate(tx.unitPrice?.toString() || '');
                  setManualAmount(tx.amount?.toString() || '');
                  setManualNotes(tx.notes || '');
                  setIsEditingTx(false);
                  setDetailSheetVisible(true);
                }}
                activeOpacity={0.7}
              >
                <Text style={[styles.tableTd, { flex: 1.2 }]} numberOfLines={1}>
                  {tx.date.substring(5)}
                </Text>
                <Text style={[styles.tableTd, { flex: 2, fontWeight: '600' }]} numberOfLines={1}>
                  {tx.type === 'purchase' ? tx.name : 'Cash'}
                </Text>
                <Text style={[styles.tableTd, { flex: 1.2, textAlign: 'right', color: '#ff4d4f' }]} numberOfLines={1}>
                  {tx.type === 'purchase' ? `₹${tx.amount}` : '-'}
                </Text>
                <Text style={[styles.tableTd, { flex: 1.2, textAlign: 'right', color: '#10b981' }]} numberOfLines={1}>
                  {tx.type === 'payment' ? `₹${tx.amount}` : '-'}
                </Text>
                <Text style={[styles.tableTd, { flex: 1.5, textAlign: 'right', fontWeight: '500' }]} numberOfLines={1}>
                  ₹{tx.runningBalance}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* ----------------------------------------------------
          FAB & Extended Buttons Menu
          ---------------------------------------------------- */}
      {isFABOpen && (
        <TouchableOpacity
          style={styles.fabBackdrop}
          activeOpacity={1}
          onPress={() => setIsFABOpen(false)}
        >
          <View style={styles.fabOptionsContainer}>
            {/* Scan Receipt Option */}
            <TouchableOpacity
              style={styles.fabOptionItem}
              onPress={handleScanReceipt}
              activeOpacity={0.8}
            >
              <Text style={styles.fabOptionLabel}>Scan Receipt</Text>
              <View style={styles.fabOptionIconBox}>
                <Camera size={16} color="#FFFFFF" />
              </View>
            </TouchableOpacity>

            {/* Voice Entry Option */}
            <TouchableOpacity
              style={styles.fabOptionItem}
              onPress={startVoiceRecordingSimulation}
              activeOpacity={0.8}
            >
              <Text style={styles.fabOptionLabel}>Voice Entry</Text>
              <View style={styles.fabOptionIconBox}>
                <Mic size={16} color="#FFFFFF" />
              </View>
            </TouchableOpacity>

            {/* Manual Entry Option */}
            <TouchableOpacity
              style={styles.fabOptionItem}
              onPress={() => {
                setEntryType('purchase');
                setManualEntryModal(true);
              }}
              activeOpacity={0.8}
            >
              <Text style={styles.fabOptionLabel}>Manual Entry</Text>
              <View style={styles.fabOptionIconBox}>
                <FileText size={16} color="#FFFFFF" />
              </View>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      )}

      <TouchableOpacity
        style={styles.fabMain}
        onPress={() => setIsFABOpen(!isFABOpen)}
        activeOpacity={0.9}
      >
        <Plus
          size={24}
          color="#FFFFFF"
          style={{ transform: [{ rotate: isFABOpen ? '45deg' : '0deg' }] }}
        />
      </TouchableOpacity>

      {/* ----------------------------------------------------
          Modal: Manual / FAB Creation Form
          ---------------------------------------------------- */}
      <Modal visible={manualEntryModal} animationType="slide" transparent>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalContentCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Transaction</Text>
              <TouchableOpacity onPress={() => setManualEntryModal(false)}>
                <X size={20} color="#A1A1AA" />
              </TouchableOpacity>
            </View>

            <View style={styles.tabButtonsRow}>
              <TouchableOpacity
                style={[styles.tabSelectBtn, entryType === 'purchase' && styles.tabSelectBtnActive]}
                onPress={() => setEntryType('purchase')}
              >
                <Text style={[styles.tabSelectText, entryType === 'purchase' && styles.tabSelectTextActive]}>
                  Purchase/Stock
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.tabSelectBtn, entryType === 'payment' && styles.tabSelectBtnActive]}
                onPress={() => setEntryType('payment')}
              >
                <Text style={[styles.tabSelectText, entryType === 'payment' && styles.tabSelectTextActive]}>
                  Cash Payment
                </Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalFormContent} showsVerticalScrollIndicator={false}>
              {entryType === 'purchase' ? (
                <>
                  <Text style={styles.formLabel}>Item Name</Text>
                  <TextInput
                    style={styles.formInput}
                    value={manualItemName}
                    onChangeText={setManualItemName}
                    placeholder="e.g. Onion, Tomato"
                    placeholderTextColor="#71717A"
                  />

                  <Text style={styles.formLabel}>Quantity (kg)</Text>
                  <TextInput
                    style={styles.formInput}
                    value={manualQty}
                    onChangeText={setManualQty}
                    placeholder="e.g. 10"
                    placeholderTextColor="#71717A"
                    keyboardType="numeric"
                  />

                  <Text style={styles.formLabel}>Unit Price (₹ per kg) [Optional]</Text>
                  <TextInput
                    style={styles.formInput}
                    value={manualRate}
                    onChangeText={setManualRate}
                    placeholder="e.g. 35"
                    placeholderTextColor="#71717A"
                    keyboardType="numeric"
                  />
                </>
              ) : (
                <>
                  <Text style={styles.formLabel}>Payment Amount (₹)</Text>
                  <TextInput
                    style={styles.formInput}
                    value={manualAmount}
                    onChangeText={setManualAmount}
                    placeholder="e.g. 2000"
                    placeholderTextColor="#71717A"
                    keyboardType="numeric"
                  />
                </>
              )}

              <Text style={styles.formLabel}>Notes</Text>
              <TextInput
                style={[styles.formInput, { height: 80, textAlignVertical: 'top' }]}
                value={manualNotes}
                onChangeText={setManualNotes}
                placeholder="Add optional notes..."
                placeholderTextColor="#71717A"
                multiline
              />

              {attachedImage && (
                <View style={styles.attachedImageContainer}>
                  <Text style={styles.formLabel}>Attached Receipt</Text>
                  <Text style={styles.attachedFileName}>📄 receipt_scanned.jpg</Text>
                </View>
              )}
            </ScrollView>

            <TouchableOpacity style={styles.formSaveBtn} onPress={handleSaveManualEntry}>
              <Save size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
              <Text style={styles.formSaveBtnText}>Save Entry</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ----------------------------------------------------
          Modal: Voice Recorder Simulation
          ---------------------------------------------------- */}
      <Modal visible={voiceModalVisible} animationType="fade" transparent>
        <View style={styles.voiceModalBackdrop}>
          <View style={styles.voiceCard}>
            <Volume2 size={48} color="#3B82F6" style={{ marginBottom: 20 }} />
            <Text style={styles.voiceCardTitle}>Listening to Voice...</Text>
            <Text style={styles.voiceCardSubtitle}>
              Speak deliveries, purchases, or ledger edits.
            </Text>
            <View style={styles.voiceTimerBox}>
              <Text style={styles.voiceTimerText}>0:0{voiceTimer}</Text>
            </View>
            <View style={styles.voicePulseBox}>
              <View style={styles.voicePulse} />
            </View>
          </View>
        </View>
      </Modal>

      {/* ----------------------------------------------------
          Detail Sheet: Bottom Sheet Modal
          ---------------------------------------------------- */}
      <Modal visible={detailSheetVisible} animationType="slide" transparent>
        <View style={styles.bottomSheetBackdrop}>
          <TouchableOpacity
            style={{ flex: 1 }}
            activeOpacity={1}
            onPress={() => {
              setDetailSheetVisible(false);
              setIsEditingTx(false);
            }}
          />
          <View style={styles.bottomSheetCard}>
            <View style={styles.bottomSheetHeader}>
              <Text style={styles.bottomSheetTitle}>
                {isEditingTx ? 'Edit Transaction' : 'Transaction Detail'}
              </Text>
              <TouchableOpacity
                onPress={() => {
                  setDetailSheetVisible(false);
                  setIsEditingTx(false);
                }}
              >
                <X size={22} color="#FFFFFF" />
              </TouchableOpacity>
            </View>

            {selectedTx && (
              <ScrollView style={styles.bottomSheetScroll} showsVerticalScrollIndicator={false}>
                {isEditingTx ? (
                  // EDIT MODE FORM
                  <View style={{ paddingVertical: 10 }}>
                    {selectedTx.type === 'purchase' ? (
                      <>
                        <Text style={styles.formLabel}>Item Name</Text>
                        <TextInput
                          style={styles.formInput}
                          value={manualItemName}
                          onChangeText={setManualItemName}
                        />
                        <Text style={styles.formLabel}>Quantity (kg)</Text>
                        <TextInput
                          style={styles.formInput}
                          value={manualQty}
                          onChangeText={setManualQty}
                          keyboardType="numeric"
                        />
                        <Text style={styles.formLabel}>Unit Price (₹)</Text>
                        <TextInput
                          style={styles.formInput}
                          value={manualRate}
                          onChangeText={setManualRate}
                          keyboardType="numeric"
                        />
                      </>
                    ) : (
                      <>
                        <Text style={styles.formLabel}>Amount (₹)</Text>
                        <TextInput
                          style={styles.formInput}
                          value={manualAmount}
                          onChangeText={setManualAmount}
                          keyboardType="numeric"
                        />
                      </>
                    )}
                    <Text style={styles.formLabel}>Notes</Text>
                    <TextInput
                      style={[styles.formInput, { height: 80, textAlignVertical: 'top' }]}
                      value={manualNotes}
                      onChangeText={setManualNotes}
                      multiline
                    />
                    <TouchableOpacity
                      style={styles.formSaveBtn}
                      onPress={handleUpdateTransaction}
                    >
                      <Save size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
                      <Text style={styles.formSaveBtnText}>Save Changes</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  // DETAIL INSPECTOR VIEW
                  <View style={{ paddingBottom: 24 }}>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Type</Text>
                      <TransactionTypeBadge type={selectedTx.type} />
                    </View>

                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Description</Text>
                      <Text style={styles.detailValue}>{selectedTx.name}</Text>
                    </View>

                    {selectedTx.type === 'purchase' && (
                      <>
                        <View style={styles.detailRow}>
                          <Text style={styles.detailLabel}>Quantity</Text>
                          <Text style={styles.detailValue}>{selectedTx.quantity} kg</Text>
                        </View>
                        <View style={styles.detailRow}>
                          <Text style={styles.detailLabel}>Rate</Text>
                          <Text style={styles.detailValue}>
                            {selectedTx.unitPrice ? `₹${selectedTx.unitPrice}/kg` : 'Pending'}
                          </Text>
                        </View>
                      </>
                    )}

                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Total Amount</Text>
                      <Text style={[styles.detailValue, { color: '#3B82F6', fontWeight: 'bold' }]}>
                        ₹{selectedTx.amount || 0}
                      </Text>
                    </View>

                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Created By</Text>
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <User size={14} color="#A1A1AA" style={{ marginRight: 4 }} />
                        <Text style={styles.detailValue}>{selectedTx.createdBy}</Text>
                      </View>
                    </View>

                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Log Date</Text>
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <Calendar size={14} color="#A1A1AA" style={{ marginRight: 4 }} />
                        <Text style={styles.detailValue}>{selectedTx.date}</Text>
                      </View>
                    </View>

                    {selectedTx.notes ? (
                      <View style={styles.detailBox}>
                        <Text style={styles.detailBoxTitle}>Notes</Text>
                        <Text style={styles.detailBoxContent}>{selectedTx.notes}</Text>
                      </View>
                    ) : null}

                    {selectedTx.transcript ? (
                      <View style={styles.detailBox}>
                        <Text style={styles.detailBoxTitle}>Voice Transcript</Text>
                        <Text style={styles.detailBoxContent}>"{selectedTx.transcript}"</Text>
                      </View>
                    ) : null}

                    {selectedTx.receiptUrl ? (
                      <View style={styles.detailBox}>
                        <Text style={styles.detailBoxTitle}>Receipt Attached</Text>
                        <Text style={[styles.detailBoxContent, { color: '#10B981' }]}>
                          📄 Scanned Image Capture
                        </Text>
                      </View>
                    ) : null}

                    <TouchableOpacity
                      style={styles.detailEditBtn}
                      onPress={() => setIsEditingTx(true)}
                    >
                      <Text style={styles.detailEditBtnText}>Edit Entry</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 64,
    paddingHorizontal: 16,
    backgroundColor: '#000000',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  topBarBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  topBarTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  searchBarInput: {
    flex: 1,
    height: 40,
    backgroundColor: '#1F1F1F',
    borderRadius: 8,
    paddingHorizontal: 12,
    color: '#FFFFFF',
    marginHorizontal: 12,
    fontSize: 14,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 16,
  },
  // -------------------------
  // Summary Card Styles
  // -------------------------
  summaryCard: {
    backgroundColor: '#1F1F1F',
    borderRadius: 24,
    padding: 24,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  summaryShopName: {
    fontSize: 14,
    color: '#A1A1AA',
    fontWeight: '600',
    marginBottom: 16,
  },
  summaryLabel: {
    fontSize: 12,
    color: '#71717A',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  summaryBalance: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 24,
  },
  summaryFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.05)',
    paddingTop: 16,
  },
  summaryFooterLabel: {
    fontSize: 10,
    color: '#71717A',
    marginBottom: 4,
  },
  summaryFooterValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  // -------------------------
  // Filter Bar Styles
  // -------------------------
  filterBarContainer: {
    marginBottom: 16,
    flexDirection: 'row',
  },
  filterBarContent: {
    paddingRight: 16,
  },
  filterChip: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 999,
    marginRight: 8,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterChipActive: {
    backgroundColor: '#3B82F6',
  },
  filterChipInactive: {
    backgroundColor: '#1F1F1F',
  },
  filterChipText: {
    fontSize: 14,
    fontWeight: '600',
  },
  filterChipTextActive: {
    color: '#FFFFFF',
  },
  filterChipTextInactive: {
    color: '#71717A',
  },
  // -------------------------
  // Group Header & Row Styles
  // -------------------------
  listSection: {
    marginTop: 8,
  },
  groupHeader: {
    fontSize: 14,
    fontWeight: '600',
    color: '#A1A1AA',
    marginTop: 16,
    marginBottom: 8,
  },
  rowWrapper: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.03)',
  },
  rowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  rowEmojiContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#1F1F1F',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  rowEmoji: {
    fontSize: 20,
  },
  rowMeta: {
    justifyContent: 'center',
    flex: 1,
  },
  rowName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  rowSub: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rowTime: {
    fontSize: 12,
    color: '#71717A',
  },
  rowRight: {
    alignItems: 'flex-end',
  },
  rowAmount: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  rowAmountDebit: {
    color: '#ff4d4f', // Red for Purchase (debited outstanding)
  },
  rowAmountCredit: {
    color: '#10b981', // Green for cash payment
  },
  rowQty: {
    fontSize: 12,
    color: '#A1A1AA',
    marginTop: 2,
  },
  // -------------------------
  // Badges Styles
  // -------------------------
  badgeVoice: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  badgeVoiceText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#3B82F6',
  },
  badgeManual: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  badgeManualText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#A1A1AA',
  },
  badgeReceipt: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  badgeReceiptText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#10B981',
  },
  typeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  typeBadgePurchase: {
    backgroundColor: 'rgba(255, 77, 79, 0.1)',
  },
  typeBadgePayment: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
  },
  typeBadgeText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  typeBadgePurchaseText: {
    color: '#ff4d4f',
  },
  typeBadgePaymentText: {
    color: '#10b981',
  },
  // -------------------------
  // Table View Styles
  // -------------------------
  tableSection: {
    marginTop: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    borderRadius: 16,
    overflow: 'hidden',
  },
  tableHeaderRow: {
    flexDirection: 'row',
    backgroundColor: '#1F1F1F',
    paddingVertical: 12,
    paddingHorizontal: 12,
  },
  tableTh: {
    fontSize: 12,
    color: '#71717A',
    fontWeight: 'bold',
  },
  tableBodyRow: {
    flexDirection: 'row',
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.03)',
    alignItems: 'center',
  },
  tableTd: {
    fontSize: 14,
    color: '#FFFFFF',
  },
  // -------------------------
  // FAB & Options Styles
  // -------------------------
  fabMain: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#3B82F6',
    justifyContent: 'center',
    alignItems: 'center',
    ...Platform.select({
      web: { boxShadow: '0px 4px 10px rgba(59, 130, 246, 0.4)' },
      default: {
        shadowColor: '#3B82F6',
        shadowOpacity: 0.4,
        shadowRadius: 10,
        shadowOffset: { width: 0, height: 4 },
      }
    }),
    zIndex: 1000,
  },
  fabBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.6)',
    zIndex: 999,
  },
  fabOptionsContainer: {
    position: 'absolute',
    bottom: 96,
    right: 24,
    alignItems: 'flex-end',
  },
  fabOptionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  fabOptionLabel: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: 'bold',
    backgroundColor: '#1F1F1F',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    marginRight: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  fabOptionIconBox: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#1F1F1F',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  // -------------------------
  // Modal Creation Card Styles
  // -------------------------
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  modalContentCard: {
    backgroundColor: '#1F1F1F',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
    maxHeight: height * 0.85,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  tabButtonsRow: {
    flexDirection: 'row',
    backgroundColor: '#000000',
    borderRadius: 8,
    padding: 2,
    marginBottom: 20,
  },
  tabSelectBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 6,
  },
  tabSelectBtnActive: {
    backgroundColor: '#1F1F1F',
  },
  tabSelectText: {
    fontSize: 14,
    color: '#71717A',
    fontWeight: '600',
  },
  tabSelectTextActive: {
    color: '#FFFFFF',
  },
  modalFormContent: {
    marginBottom: 20,
  },
  formLabel: {
    fontSize: 12,
    color: '#A1A1AA',
    fontWeight: 'bold',
    marginBottom: 8,
    marginTop: 12,
  },
  formInput: {
    backgroundColor: '#000000',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: '#FFFFFF',
    fontSize: 15,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  formSaveBtn: {
    backgroundColor: '#3B82F6',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  formSaveBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  attachedImageContainer: {
    marginTop: 12,
    padding: 12,
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.2)',
  },
  attachedFileName: {
    color: '#10B981',
    fontSize: 13,
    fontWeight: '600',
  },
  // -------------------------
  // Bottom Sheet Details Styles
  // -------------------------
  bottomSheetBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  bottomSheetCard: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#1F1F1F',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
    maxHeight: height * 0.75,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  bottomSheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  bottomSheetTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  bottomSheetScroll: {
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.02)',
  },
  detailLabel: {
    fontSize: 14,
    color: '#71717A',
  },
  detailValue: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  detailBox: {
    backgroundColor: '#000000',
    padding: 16,
    borderRadius: 12,
    marginTop: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  detailBoxTitle: {
    fontSize: 11,
    color: '#71717A',
    fontWeight: 'bold',
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  detailBoxContent: {
    fontSize: 14,
    color: '#FFFFFF',
    lineHeight: 20,
  },
  detailEditBtn: {
    marginTop: 24,
    borderWidth: 1,
    borderColor: '#3B82F6',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  detailEditBtnText: {
    color: '#3B82F6',
    fontSize: 14,
    fontWeight: 'bold',
  },
  // -------------------------
  // Empty State Styles
  // -------------------------
  emptyStateContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
  },
  emptyStateEmoji: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  emptyStateSubtitle: {
    fontSize: 14,
    color: '#71717A',
    textAlign: 'center',
    paddingHorizontal: 32,
    lineHeight: 20,
  },
  // -------------------------
  // Voice Modal Simulation Styles
  // -------------------------
  voiceModalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  voiceCard: {
    width: width * 0.8,
    padding: 32,
    borderRadius: 24,
    backgroundColor: '#1F1F1F',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  voiceCardTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  voiceCardSubtitle: {
    fontSize: 13,
    color: '#71717A',
    textAlign: 'center',
    marginBottom: 24,
  },
  voiceTimerBox: {
    backgroundColor: '#000000',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 12,
    marginBottom: 20,
  },
  voiceTimerText: {
    fontSize: 14,
    color: '#3B82F6',
    fontWeight: 'bold',
  },
  voicePulseBox: {
    height: 10,
    width: width * 0.4,
    backgroundColor: '#000000',
    borderRadius: 5,
    overflow: 'hidden',
  },
  voicePulse: {
    width: '60%',
    height: '100%',
    backgroundColor: '#3B82F6',
    borderRadius: 5,
  },
});
