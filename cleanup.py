import codecs

path = r"d:\Major Project\mobile\src\screens\admin\AdminNotificationsScreen.tsx"

with codecs.open(path, 'r', 'utf-8') as f:
    text = f.read()

# 1. State Replacement
old_state = """  const [showCreateModal, setShowCreateModal] = useState(false);
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');

  const [notificationType, setNotificationType] = useState<NotificationType>('general');

  const [courses, setCourses] = useState<any[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<any>(null);
  const [showCoursePicker, setShowCoursePicker] = useState(false);

  const [chapters, setChapters] = useState<any[]>([]);
  const [selectedChapter, setSelectedChapter] = useState<any>(null);
  const [showChapterPicker, setShowChapterPicker] = useState(false);

  const [offers, setOffers] = useState<any[]>([]);
  const [selectedOffer, setSelectedOffer] = useState<any>(null);
  const [showOfferPicker, setShowOfferPicker] = useState(false);

  const [users, setUsers] = useState<any[]>([]);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [showUserPicker, setShowUserPicker] = useState(false);

  const [notifications, setNotifications] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const [sendingProgress, setSendingProgress] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [historySearchQuery, setHistorySearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<'all' | NotificationType>('all');

  useFocusEffect(
    useCallback(() => {
      fetchCourses();
      fetchOffers();
      fetchUsers();
      fetchNotifications();
    }, [])
  );

  useEffect(() => {
    if (selectedCourse) {
      fetchChapters(selectedCourse.id);
    } else {
      setChapters([]);
      setSelectedChapter(null);
    }
  }, [selectedCourse]);"""

new_state = """  const [notifications, setNotifications] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const [historySearchQuery, setHistorySearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<'all' | NotificationType>('all');

  useFocusEffect(
    useCallback(() => {
      fetchNotifications();
    }, [])
  );"""
if old_state in text:
    text = text.replace(old_state, new_state)
    print("Replaced states.")
else:
    print("old_state not found.")

# 2. Header Replacement
old_header = """      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <ChevronLeft size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Notifications</Text>
        <TouchableOpacity onPress={clearAllNotifications} style={styles.clearButton}>
          <Trash2 size={20} color="#ef4444" />
        </TouchableOpacity>
      </View>"""
new_header = """      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <ChevronLeft size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Notifications</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <TouchableOpacity onPress={() => (navigation as any).navigate('AdminNewBroadcast')} style={{ padding: 8, borderRadius: 8, backgroundColor: colors.primary + '15' }}>
            <Plus size={20} color={colors.primary} />
          </TouchableOpacity>
          <TouchableOpacity onPress={clearAllNotifications} style={styles.clearButton}>
            <Trash2 size={20} color="#ef4444" />
          </TouchableOpacity>
        </View>
      </View>"""
if old_header in text:
    text = text.replace(old_header, new_header)
    print("Replaced header.")
else:
    print("old_header not found.")

# 3. Method blocks removal
start_idx = text.find("  const fetchCourses = async () => {")
end_str = "    (u.email?.toLowerCase() || '').includes(searchQuery.toLowerCase())\n  );\n"
end_idx = text.find(end_str)

if start_idx != -1 and end_idx != -1 and start_idx < end_idx:
    print("Removing fetch functions.")
    text = text[:start_idx] + text[end_idx + len(end_str):]
else:
    print("fetch functions block not found.", start_idx, end_idx)

# 4. Modals and FAB removal
fab_start_idx = text.find("      <TouchableOpacity\n        style={{\n          position: 'absolute',\n          bottom: 24,")
modal_end_str = "    </SafeAreaView>\n  );\n}"
modal_end_idx = text.find(modal_end_str)

if fab_start_idx != -1 and modal_end_idx != -1 and fab_start_idx < modal_end_idx:
    print("Removing FAB and Modals.")
    text = text[:fab_start_idx] + modal_end_str + text[modal_end_idx + len(modal_end_str):]
else:
    print("Modals block not found.", fab_start_idx, modal_end_idx)

with codecs.open(path, 'w', 'utf-8') as f:
    f.write(text)
print('All Done!')
