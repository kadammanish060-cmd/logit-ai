import React from 'react';
import {
  StyleSheet,
  Text,
  View,
  Image,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { FileText, FileSpreadsheet, X, File } from 'lucide-react-native';
import { Theme } from '../styles/theme';

export interface SelectedAttachment {
  id: string;
  type: 'image' | 'file';
  uri: string;
  name: string;
  size?: number;
  mimeType?: string;
}

const formatBytes = (bytes?: number) => {
  if (bytes === undefined || bytes === null) return '';
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
};

const getFileIcon = (name: string) => {
  const ext = name.toLowerCase().split('.').pop() || '';
  if (ext === 'pdf') {
    return <FileText size={18} color="#EF4444" strokeWidth={1.5} />;
  } else if (['xls', 'xlsx', 'csv'].includes(ext)) {
    return <FileSpreadsheet size={18} color="#10B981" strokeWidth={1.5} />;
  }
  return <File size={18} color="#3B82F6" strokeWidth={1.5} />;
};

// --- Image Thumbnail Component ---
export const ImageThumbnail = ({
  item,
  onRemove,
}: {
  item: SelectedAttachment;
  onRemove: () => void;
}) => {
  return (
    <View style={styles.thumbnailContainer}>
      <Image source={{ uri: item.uri }} style={styles.thumbnailImage} />
      <View style={styles.thumbnailTextWrapper}>
        <Text numberOfLines={1} style={styles.thumbnailName}>
          {item.name}
        </Text>
      </View>
      <TouchableOpacity style={styles.removeButton} onPress={onRemove} activeOpacity={0.7}>
        <X size={14} color="#A1A1AA" strokeWidth={2} />
      </TouchableOpacity>
    </View>
  );
};

// --- File Chip Component ---
export const AttachmentChip = ({
  item,
  onRemove,
}: {
  item: SelectedAttachment;
  onRemove: () => void;
}) => {
  return (
    <View style={styles.chipContainer}>
      <View style={styles.iconWrapper}>
        {getFileIcon(item.name)}
      </View>
      <View style={styles.chipTextWrapper}>
        <Text numberOfLines={1} style={styles.chipName}>
          {item.name}
        </Text>
        {item.size !== undefined && (
          <Text style={styles.chipSize}>{formatBytes(item.size)}</Text>
        )}
      </View>
      <TouchableOpacity style={styles.removeButton} onPress={onRemove} activeOpacity={0.7}>
        <X size={14} color="#A1A1AA" strokeWidth={2} />
      </TouchableOpacity>
    </View>
  );
};

// --- Attachment Preview Horizontal List Component ---
export const AttachmentPreview = ({
  attachments,
  onRemove,
}: {
  attachments: SelectedAttachment[];
  onRemove: (id: string) => void;
}) => {
  if (!attachments || attachments.length === 0) return null;

  return (
    <View style={styles.previewOuterContainer}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {attachments.map(item => {
          if (item.type === 'image') {
            return (
              <ImageThumbnail
                key={item.id}
                item={item}
                onRemove={() => onRemove(item.id)}
              />
            );
          } else {
            return (
              <AttachmentChip
                key={item.id}
                item={item}
                onRemove={() => onRemove(item.id)}
              />
            );
          }
        })}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  previewOuterContainer: {
    width: '100%',
    maxHeight: 74,
    marginBottom: 8,
  },
  scrollContent: {
    paddingHorizontal: 4,
    alignItems: 'center',
  },
  thumbnailContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1F1F1F',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 12,
    padding: 6,
    marginRight: 8,
    width: 160,
    height: 56,
    position: 'relative',
  },
  thumbnailImage: {
    width: 42,
    height: 42,
    borderRadius: 6,
    marginRight: 8,
    backgroundColor: '#2A2A2A',
  },
  thumbnailTextWrapper: {
    flex: 1,
    marginRight: 18,
  },
  thumbnailName: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '500',
  },
  chipContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1F1F1F',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginRight: 8,
    width: 180,
    height: 56,
    position: 'relative',
  },
  iconWrapper: {
    marginRight: 8,
  },
  chipTextWrapper: {
    flex: 1,
    marginRight: 18,
  },
  chipName: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '500',
  },
  chipSize: {
    color: '#A1A1AA',
    fontSize: 10,
    marginTop: 2,
  },
  removeButton: {
    position: 'absolute',
    top: 6,
    right: 6,
    padding: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 999,
  },
});
