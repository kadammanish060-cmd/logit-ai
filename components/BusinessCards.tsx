import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Theme, useTheme } from '../styles/theme';
import {
  Receipt,
  TrendingDown,
  Package,
  Truck,
  CheckCircle2,
  XCircle,
  CreditCard,
  Wallet,
  BookOpen,
  FileSpreadsheet,
  BarChart3,
} from 'lucide-react-native';

const useCardStyles = () => {
  const { colors } = useTheme();
  const styles = React.useMemo(() => getStyles(colors), [colors]);
  return { styles, colors };
};

// --- Card 1: Receipt Card ---
export const ReceiptCard = ({ data }: { data: any }) => {
  const { styles, colors } = useCardStyles();
  const isPending = data.isPending ?? data.role === 'normal';
  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Receipt size={18} color={colors.secondaryText} strokeWidth={1.5} />
        <Text style={styles.cardTitle}>Receipt</Text>
        <View style={[styles.badge, isPending ? styles.badgePending : styles.badgeConfirmed]}>
          <Text style={[styles.badgeText, isPending ? styles.badgeTextPending : styles.badgeTextConfirmed]}>
            {isPending ? 'Pending' : 'Confirmed'}
          </Text>
        </View>
      </View>
      <View style={styles.cardBody}>
        <View style={styles.row}>
          <Text style={styles.label}>Shop</Text>
          <Text style={styles.value}>{data.shopName || 'Unknown'}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Item</Text>
          <Text style={styles.value}>{data.itemName || 'Unknown'}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Quantity</Text>
          <Text style={[styles.value, styles.accentValue]}>{data.quantity || 0} kg</Text>
        </View>
        {data.date && (
          <View style={styles.row}>
            <Text style={styles.label}>Date</Text>
            <Text style={styles.subValue}>{data.date}</Text>
          </View>
        )}
      </View>
    </View>
  );
};

// --- Card 2: Expense Card ---
export const ExpenseCard = ({ data }: { data: any }) => {
  const { styles, colors } = useCardStyles();
  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <TrendingDown size={18} color={colors.secondaryText} strokeWidth={1.5} />
        <Text style={styles.cardTitle}>Expense Logged</Text>
      </View>
      <View style={styles.cardBody}>
        <View style={styles.row}>
          <Text style={styles.label}>Purchased Item</Text>
          <Text style={styles.value}>{data.itemName || 'Unknown'}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Quantity</Text>
          <Text style={styles.value}>{data.quantity || 0} kg</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Total Expense</Text>
          <Text style={[styles.value, styles.accentValue]}>₹{data.pricePaid || 0}</Text>
        </View>
        {data.date && (
          <View style={styles.row}>
            <Text style={styles.label}>Date</Text>
            <Text style={styles.subValue}>{data.date}</Text>
          </View>
        )}
      </View>
    </View>
  );
};

// --- Card 3: Inventory Card ---
export const InventoryCard = ({ data }: { data: any }) => {
  const { styles, colors } = useCardStyles();
  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Package size={18} color={colors.secondaryText} strokeWidth={1.5} />
        <Text style={styles.cardTitle}>Inventory Update</Text>
      </View>
      <View style={styles.cardBody}>
        <View style={styles.row}>
          <Text style={styles.label}>Stock Item</Text>
          <Text style={[styles.value, styles.accentValue]}>{data.itemName || 'Unknown'}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Added Quantity</Text>
          <Text style={styles.value}>{data.quantity || 0} kg</Text>
        </View>
        {data.date && (
          <View style={styles.row}>
            <Text style={styles.label}>Updated On</Text>
            <Text style={styles.subValue}>{data.date}</Text>
          </View>
        )}
      </View>
    </View>
  );
};

// --- Card 4: Supplier Card ---
export const SupplierCard = ({ data }: { data: any }) => {
  const { styles, colors } = useCardStyles();
  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Truck size={18} color={colors.secondaryText} strokeWidth={1.5} />
        <Text style={styles.cardTitle}>Supplier Rate Update</Text>
      </View>
      <View style={styles.cardBody}>
        <View style={styles.row}>
          <Text style={styles.label}>Supplier Shop</Text>
          <Text style={styles.value}>{data.shopName || 'Unknown'}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Item</Text>
          <Text style={styles.value}>{data.itemName || 'Unknown'}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Rate Per Unit</Text>
          <Text style={[styles.value, styles.accentValue]}>₹{data.unitPrice || 0} / kg</Text>
        </View>
      </View>
    </View>
  );
};

// --- Card 5: Approval Card ---
export const ApprovalCard = ({ data, isApprove }: { data: any; isApprove: boolean }) => {
  const { styles, colors } = useCardStyles();
  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        {isApprove ? (
          <CheckCircle2 size={18} color={colors.accent} strokeWidth={1.5} />
        ) : (
          <XCircle size={18} color={colors.mutedText} strokeWidth={1.5} />
        )}
        <Text style={styles.cardTitle}>Approval Decision</Text>
      </View>
      <View style={styles.cardBody}>
        <View style={styles.row}>
          <Text style={styles.label}>Request ID</Text>
          <Text style={styles.subValue}>{data.approvalId || 'Unknown'}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Resolution</Text>
          <Text style={[styles.value, isApprove ? styles.accentValue : { color: colors.mutedText }]}>
            {isApprove ? 'APPROVED' : 'REJECTED'}
          </Text>
        </View>
      </View>
    </View>
  );
};

// --- Card 6: Payment Card ---
export const PaymentCard = ({ data }: { data: any }) => {
  const { styles, colors } = useCardStyles();
  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <CreditCard size={18} color={colors.secondaryText} strokeWidth={1.5} />
        <Text style={styles.cardTitle}>Payment Logged</Text>
      </View>
      <View style={styles.cardBody}>
        <View style={styles.row}>
          <Text style={styles.label}>Shop Name</Text>
          <Text style={styles.value}>{data.shopName || 'Unknown'}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Amount Paid</Text>
          <Text style={[styles.value, styles.accentValue]}>₹{data.amount || 0}</Text>
        </View>
        {data.date && (
          <View style={styles.row}>
            <Text style={styles.label}>Received On</Text>
            <Text style={styles.subValue}>{data.date}</Text>
          </View>
        )}
      </View>
    </View>
  );
};

// --- Card 7: Customer Balance Card ---
export const CustomerBalanceCard = ({ data }: { data: any }) => {
  const { styles, colors } = useCardStyles();
  const entries = Object.entries(data || {});
  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Wallet size={18} color={colors.secondaryText} strokeWidth={1.5} />
        <Text style={styles.cardTitle}>Customer Balances</Text>
      </View>
      <View style={styles.cardBody}>
        {entries.length > 0 ? (
          entries.map(([shopName, bal]) => (
            <View key={shopName} style={styles.row}>
              <Text style={styles.label}>{shopName}</Text>
              <Text style={[styles.value, styles.accentValue]}>₹{Number(bal)}</Text>
            </View>
          ))
        ) : (
          <Text style={styles.noDataText}>No balance entries found.</Text>
        )}
      </View>
    </View>
  );
};

// --- Card 8: Ledger Entry Card ---
export const LedgerEntryCard = ({ data }: { data: any }) => {
  const { styles, colors } = useCardStyles();
  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <BookOpen size={18} color={colors.secondaryText} strokeWidth={1.5} />
        <Text style={styles.cardTitle}>Ledger Entry Logged</Text>
      </View>
      <View style={styles.cardBody}>
        <View style={styles.row}>
          <Text style={styles.label}>Shop</Text>
          <Text style={styles.value}>{data.shopName || 'Unknown'}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Item</Text>
          <Text style={styles.value}>{data.itemName || 'Unknown'}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Quantity</Text>
          <Text style={styles.value}>{data.quantity || 0} kg</Text>
        </View>
        {data.unitPrice !== undefined && (
          <View style={styles.row}>
            <Text style={styles.label}>Rate per kg</Text>
            <Text style={styles.value}>₹{data.unitPrice}</Text>
          </View>
        )}
        {data.totalPrice !== undefined && (
          <View style={styles.row}>
            <Text style={styles.label}>Total Price</Text>
            <Text style={[styles.value, styles.accentValue]}>₹{data.totalPrice}</Text>
          </View>
        )}
      </View>
    </View>
  );
};

// --- Card 9: Purchase Order Card ---
export const PurchaseOrderCard = ({ data }: { data: any }) => {
  const { styles, colors } = useCardStyles();
  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <FileSpreadsheet size={18} color={colors.secondaryText} strokeWidth={1.5} />
        <Text style={styles.cardTitle}>Purchase Order</Text>
      </View>
      <View style={styles.cardBody}>
        <View style={styles.row}>
          <Text style={styles.label}>Ordered Item</Text>
          <Text style={styles.value}>{data.itemName || 'Unknown'}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Order Quantity</Text>
          <Text style={styles.value}>{data.quantity || 0} kg</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Estimated Cost</Text>
          <Text style={[styles.value, styles.accentValue]}>₹{data.pricePaid || 0}</Text>
        </View>
      </View>
    </View>
  );
};

// --- Card 10: Daily Sales Summary Card ---
export const DailySalesSummaryCard = ({ data }: { data: any }) => {
  const { styles, colors } = useCardStyles();
  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <BarChart3 size={18} color={colors.secondaryText} strokeWidth={1.5} />
        <Text style={styles.cardTitle}>Daily Sales Summary</Text>
      </View>
      <View style={styles.cardBody}>
        <View style={styles.row}>
          <Text style={styles.label}>Shop Name</Text>
          <Text style={styles.value}>{data.shopName || 'Unknown'}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Total Billing</Text>
          <Text style={[styles.value, styles.accentValue]}>₹{data.totalBill || 0}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Status</Text>
          <Text style={styles.value}>Locked & Finalized</Text>
        </View>
        {data.date && (
          <View style={styles.row}>
            <Text style={styles.label}>Summary Date</Text>
            <Text style={styles.subValue}>{data.date}</Text>
          </View>
        )}
      </View>
    </View>
  );
};

// --- Business Card Dispatcher Component ---
export const BusinessCardDispatcher = ({
  toolExecuted,
  toolResult,
}: {
  toolExecuted: string | null;
  toolResult: any;
}) => {
  if (!toolExecuted || !toolResult || toolResult.error) return null;

  switch (toolExecuted) {
    case 'logDelivery':
      return <ReceiptCard data={toolResult} />;
    case 'logPurchase':
      return <ExpenseCard data={toolResult} />;
    case 'logPayment':
      return <PaymentCard data={toolResult} />;
    case 'setPrice':
      return <SupplierCard data={toolResult} />;
    case 'lockLedger':
      return <DailySalesSummaryCard data={toolResult} />;
    case 'getOutstandingBalance':
      return <CustomerBalanceCard data={toolResult} />;
    case 'getLedger':
      return <LedgerEntryCard data={toolResult} />;
    case 'approveEntry':
      return <ApprovalCard data={toolResult} isApprove={true} />;
    case 'rejectEntry':
      return <ApprovalCard data={toolResult} isApprove={false} />;
    default:
      return null;
  }
};

const getStyles = (colors: typeof Theme.colors) => StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: Theme.radius.card,
    padding: Theme.spacing.md,
    width: '100%',
    marginVertical: Theme.spacing.xs,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Theme.spacing.base,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingBottom: Theme.spacing.sm,
  },
  cardTitle: {
    ...Theme.typography.bodyMd,
    fontWeight: '600',
    color: colors.primaryText,
    marginLeft: Theme.spacing.sm,
    flex: 1,
  },
  cardBody: {
    width: '100%',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: Theme.spacing.xs,
    paddingVertical: Theme.spacing.xs / 2,
  },
  label: {
    ...Theme.typography.bodyMd,
    color: colors.secondaryText,
  },
  value: {
    ...Theme.typography.bodyMd,
    color: colors.primaryText,
    fontWeight: '500',
  },
  accentValue: {
    color: colors.accent,
    fontWeight: '600',
  },
  subValue: {
    ...Theme.typography.labelSm,
    color: colors.mutedText,
  },
  noDataText: {
    ...Theme.typography.bodyMd,
    color: colors.mutedText,
    textAlign: 'center',
    paddingVertical: Theme.spacing.base,
  },
  badge: {
    borderRadius: Theme.radius.button,
    paddingVertical: 2,
    paddingHorizontal: 8,
  },
  badgePending: {
    backgroundColor: 'rgba(113, 113, 122, 0.1)',
  },
  badgeConfirmed: {
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '600',
  },
  badgeTextPending: {
    color: colors.mutedText,
  },
  badgeTextConfirmed: {
    color: colors.accent,
  },
});
