import { useState } from 'react';
import {
  StyleSheet, Text, View, TextInput, ActivityIndicator, FlatList,
  TouchableOpacity, ScrollView, StatusBar, RefreshControl,
} from 'react-native';

const ODOO_URL = 'http://192.168.11.115:8069';
const DB_NAME = 'stage_odoo';

const TYPES = [
  ['installation', 'Installation'],
  ['maintenance', 'Maintenance'],
  ['depannage', 'Dépannage'],
  ['reparation', 'Réparation'],
  ['mise_a_jour', 'Mise à jour'],
  ['assistance', 'Assistance'],
  ['autre', 'Autre'],
];

const PRIORITIES = [
  ['faible', 'Faible'],
  ['normale', 'Normale'],
  ['haute', 'Haute'],
  ['urgente', 'Urgente'],
];

const STATES_ORDER = ['brouillon', 'planifiee', 'en_cours', 'terminee', 'annulee'];

const STATE_STYLE = {
  brouillon: { bg: '#e5e7eb', text: '#4b5563', label: 'Brouillon' },
  planifiee: { bg: '#dbeafe', text: '#1d4ed8', label: 'Planifiée' },
  en_cours: { bg: '#fef3c7', text: '#b45309', label: 'En cours' },
  terminee: { bg: '#dcfce7', text: '#15803d', label: 'Terminée' },
  annulee: { bg: '#fee2e2', text: '#b91c1c', label: 'Annulée' },
};

const PRIORITY_STYLE = {
  faible: { bg: '#f3f4f6', text: '#6b7280', label: 'Faible' },
  normale: { bg: '#e0e7ff', text: '#4338ca', label: 'Normale' },
  haute: { bg: '#fed7aa', text: '#c2410c', label: 'Haute' },
  urgente: { bg: '#fecaca', text: '#dc2626', label: 'Urgente' },
};

function Badge({ style }) {
  if (!style) return null;
  return (
    <View style={[styles.badge, { backgroundColor: style.bg }]}>
      <Text style={[styles.badgeText, { color: style.text }]}>{style.label}</Text>
    </View>
  );
}

function PrimaryButton({ title, onPress, color = '#3b82f6' }) {
  return (
    <TouchableOpacity style={[styles.primaryButton, { backgroundColor: color }]} onPress={onPress}>
      <Text style={styles.primaryButtonText}>{title}</Text>
    </TouchableOpacity>
  );
}

function SecondaryButton({ title, onPress, color = '#6b7280' }) {
  return (
    <TouchableOpacity style={[styles.secondaryButton, { borderColor: color }]} onPress={onPress}>
      <Text style={[styles.secondaryButtonText, { color }]}>{title}</Text>
    </TouchableOpacity>
  );
}

function InterventionCard({ item, onPress }) {
  const stateStyle = STATE_STYLE[item.state];
  const priorityStyle = PRIORITY_STYLE[item.priority];
  return (
    <TouchableOpacity style={styles.card} onPress={onPress}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle}>{item.name}</Text>
        <Badge style={priorityStyle} />
      </View>
      <Text style={styles.cardPartner}>{item.partner_id ? item.partner_id[1] : 'Sans client'}</Text>
      <Badge style={stateStyle} />
    </TouchableOpacity>
  );
}

export default function App() {
  const [login, setLogin] = useState('admin');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [connected, setConnected] = useState(false);
  const [interventions, setInterventions] = useState([]);
  const [selected, setSelected] = useState(null);
  const [viewMode, setViewMode] = useState('list'); // 'list' | 'kanban'

  const [creating, setCreating] = useState(false);
  const [partnerQuery, setPartnerQuery] = useState('');
  const [partnerResults, setPartnerResults] = useState([]);
  const [newPartner, setNewPartner] = useState(null);
  const [newType, setNewType] = useState('depannage');
  const [newPriority, setNewPriority] = useState('normale');
  const [newDescription, setNewDescription] = useState('');

  const callOdoo = async (model, method, args = [], kwargs = {}) => {
    const response = await fetch(`${ODOO_URL}/web/dataset/call_kw`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'call',
        params: { model, method, args, kwargs },
      }),
    });
    const data = await response.json();
    if (data.error) {
      throw new Error(data.error.data?.message || 'Erreur Odoo');
    }
    return data.result;
  };

  const loadInterventions = async () => {
    const result = await callOdoo(
      'technical.intervention',
      'search_read',
      [[]],
      { fields: ['name', 'partner_id', 'state', 'priority'], limit: 100 }
    );
    setInterventions(result);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await loadInterventions();
    } catch (err) {
      setError(`Erreur : ${err.message}`);
    }
    setRefreshing(false);
  };

  const handleLogin = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${ODOO_URL}/web/session/authenticate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'call',
          params: { db: DB_NAME, login, password },
        }),
      });
      const data = await response.json();
      if (!data.result || !data.result.uid) {
        setError('Identifiants incorrects.');
        setLoading(false);
        return;
      }
      await loadInterventions();
      setConnected(true);
    } catch (err) {
      setError(`Erreur : ${err.message}`);
    }
    setLoading(false);
  };

  const handleLogout = () => {
    setConnected(false);
    setSelected(null);
    setCreating(false);
    setInterventions([]);
    setPassword('');
    setError(null);
  };

  const openDetail = async (id) => {
    const result = await callOdoo(
      'technical.intervention',
      'read',
      [[id]],
      { fields: ['name', 'partner_id', 'technician_id', 'state', 'priority', 'description', 'diagnosis', 'solution'] }
    );
    setSelected(result[0]);
  };

  const runAction = async (actionName) => {
    setLoading(true);
    try {
      await callOdoo('technical.intervention', actionName, [[selected.id]]);
      await openDetail(selected.id);
      await loadInterventions();
    } catch (err) {
      setError(`Erreur : ${err.message}`);
    }
    setLoading(false);
  };

  const searchPartners = async (text) => {
    setPartnerQuery(text);
    if (text.length < 2) {
      setPartnerResults([]);
      return;
    }
    const result = await callOdoo(
      'res.partner',
      'search_read',
      [[['name', 'ilike', text]]],
      { fields: ['name'], limit: 10 }
    );
    setPartnerResults(result);
  };

  const openCreate = () => {
    setNewPartner(null);
    setPartnerQuery('');
    setPartnerResults([]);
    setNewType('depannage');
    setNewPriority('normale');
    setNewDescription('');
    setError(null);
    setCreating(true);
  };

  const submitCreate = async () => {
    if (!newPartner) {
      setError('Sélectionne un client.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await callOdoo('technical.intervention', 'create', [{
        partner_id: newPartner.id,
        intervention_type: newType,
        priority: newPriority,
        description: newDescription,
      }]);
      await loadInterventions();
      setCreating(false);
    } catch (err) {
      setError(`Erreur : ${err.message}`);
    }
    setLoading(false);
  };

  const nextAction = {
    brouillon: { label: 'Planifier', action: 'action_planifier' },
    planifiee: { label: 'Démarrer', action: 'action_demarrer' },
    en_cours: { label: 'Terminer', action: 'action_terminer' },
  };

  const canCancel = selected && selected.state !== 'terminee' && selected.state !== 'annulee';
  const canResetToDraft = selected && selected.state !== 'brouillon';

  // ---------- Écran : Création ----------
  if (creating) {
    return (
      <View style={styles.screen}>
        <StatusBar barStyle="dark-content" />
        <View style={styles.appBar}>
          <TouchableOpacity onPress={() => setCreating(false)}>
            <Text style={styles.appBarBack}>Annuler</Text>
          </TouchableOpacity>
          <Text style={styles.appBarTitle}>Nouvelle intervention</Text>
          <View style={{ width: 50 }} />
        </View>
        <ScrollView style={styles.container}>
          <Text style={styles.label}>Client</Text>
          {newPartner ? (
            <TouchableOpacity onPress={() => setNewPartner(null)} style={styles.selectedPartner}>
              <Text style={styles.selectedPartnerText}>{newPartner.name}</Text>
              <Text style={styles.changeLink}>changer</Text>
            </TouchableOpacity>
          ) : (
            <>
              <TextInput
                style={styles.input}
                placeholder="Rechercher un client..."
                value={partnerQuery}
                onChangeText={searchPartners}
              />
              {partnerResults.map((p) => (
                <TouchableOpacity key={p.id} style={styles.partnerResult} onPress={() => setNewPartner(p)}>
                  <Text>{p.name}</Text>
                </TouchableOpacity>
              ))}
            </>
          )}

          <Text style={styles.label}>Type d'intervention</Text>
          <View style={styles.chipRow}>
            {TYPES.map(([key, label]) => (
              <TouchableOpacity
                key={key}
                style={[styles.chip, newType === key && styles.chipSelected]}
                onPress={() => setNewType(key)}
              >
                <Text style={newType === key ? styles.chipTextSelected : styles.chipText}>{label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.label}>Priorité</Text>
          <View style={styles.chipRow}>
            {PRIORITIES.map(([key, label]) => {
              const st = PRIORITY_STYLE[key];
              const active = newPriority === key;
              return (
                <TouchableOpacity
                  key={key}
                  style={[styles.chip, { backgroundColor: active ? st.text : st.bg, borderColor: st.text }]}
                  onPress={() => setNewPriority(key)}
                >
                  <Text style={{ color: active ? '#fff' : st.text, fontWeight: '600' }}>{label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <Text style={styles.label}>Problème signalé</Text>
          <TextInput
            style={[styles.input, { height: 90, textAlignVertical: 'top' }]}
            placeholder="Description du problème..."
            value={newDescription}
            onChangeText={setNewDescription}
            multiline
          />

          <View style={{ marginTop: 24, marginBottom: 40 }}>
            <PrimaryButton title="Créer l'intervention" onPress={submitCreate} />
          </View>
          {loading && <ActivityIndicator style={{ marginTop: 10 }} />}
          {error && <Text style={styles.error}>{error}</Text>}
        </ScrollView>
      </View>
    );
  }

  // ---------- Écran : Détail ----------
  if (selected) {
    const next = nextAction[selected.state];
    const stateStyle = STATE_STYLE[selected.state];
    const priorityStyle = PRIORITY_STYLE[selected.priority];
    return (
      <View style={styles.screen}>
        <StatusBar barStyle="dark-content" />
        <View style={styles.appBar}>
          <TouchableOpacity onPress={() => setSelected(null)}>
            <Text style={styles.appBarBack}>{'‹ Retour'}</Text>
          </TouchableOpacity>
          <Text style={styles.appBarTitle}>{selected.name}</Text>
          <View style={{ width: 50 }} />
        </View>
        <ScrollView style={styles.container}>
          <View style={styles.badgeRow}>
            <Badge style={stateStyle} />
            <Badge style={priorityStyle} />
          </View>

          <Text style={styles.label}>Client</Text>
          <Text style={styles.value}>{selected.partner_id ? selected.partner_id[1] : '-'}</Text>

          <Text style={styles.label}>Technicien</Text>
          <Text style={styles.value}>{selected.technician_id ? selected.technician_id[1] : 'Non assigné'}</Text>

          <Text style={styles.label}>Description</Text>
          <Text style={styles.value}>{selected.description || '-'}</Text>

          <Text style={styles.label}>Diagnostic</Text>
          <Text style={styles.value}>{selected.diagnosis || '-'}</Text>

          <Text style={styles.label}>Solution</Text>
          <Text style={styles.value}>{selected.solution || '-'}</Text>

          <View style={{ marginTop: 24, gap: 10, marginBottom: 40 }}>
            {next && <PrimaryButton title={next.label} onPress={() => runAction(next.action)} />}
            {canCancel && <SecondaryButton title="Annuler l'intervention" color="#dc2626" onPress={() => runAction('action_annuler')} />}
            {canResetToDraft && <SecondaryButton title="Remettre en brouillon" color="#6b7280" onPress={() => runAction('action_remettre_en_brouillon')} />}
          </View>
          {loading && <ActivityIndicator style={{ marginTop: 10 }} />}
        </ScrollView>
      </View>
    );
  }

  // ---------- Écran : Liste / Kanban (connecté) ----------
  if (connected) {
    const grouped = STATES_ORDER.map((state) => ({
      state,
      items: interventions.filter((i) => i.state === state),
    }));

    return (
      <View style={styles.screen}>
        <StatusBar barStyle="dark-content" />
        <View style={styles.appBar}>
          <Text style={styles.appBarTitle}>Interventions</Text>
          <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
            <TouchableOpacity onPress={openCreate} style={styles.addButtonWrap}>
              <Text style={styles.addButtonText}>+ Nouvelle</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.toggleRow}>
          <TouchableOpacity
            style={[styles.toggleButton, viewMode === 'list' && styles.toggleButtonActive]}
            onPress={() => setViewMode('list')}
          >
            <Text style={viewMode === 'list' ? styles.toggleTextActive : styles.toggleText}>Liste</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.toggleButton, viewMode === 'kanban' && styles.toggleButtonActive]}
            onPress={() => setViewMode('kanban')}
          >
            <Text style={viewMode === 'kanban' ? styles.toggleTextActive : styles.toggleText}>Kanban</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={handleLogout} style={{ marginLeft: 'auto', paddingHorizontal: 8 }}>
            <Text style={{ color: '#dc2626', fontSize: 13 }}>Déconnexion</Text>
          </TouchableOpacity>
        </View>

        {viewMode === 'list' ? (
          <FlatList
            style={styles.container}
            data={interventions}
            keyExtractor={(item) => String(item.id)}
            contentContainerStyle={{ paddingBottom: 20 }}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
            renderItem={({ item }) => (
              <InterventionCard item={item} onPress={() => openDetail(item.id)} />
            )}
            ListEmptyComponent={<Text style={styles.value}>Aucune intervention.</Text>}
          />
        ) : (
          <ScrollView
            horizontal
            style={styles.kanbanScroll}
            contentContainerStyle={{ paddingHorizontal: 12 }}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          >
            {grouped.map(({ state, items }) => {
              const st = STATE_STYLE[state];
              return (
                <View key={state} style={styles.kanbanColumn}>
                  <View style={[styles.kanbanColumnHeader, { backgroundColor: st.bg }]}>
                    <Text style={[styles.kanbanColumnTitle, { color: st.text }]}>{st.label}</Text>
                    <Text style={[styles.kanbanColumnCount, { color: st.text }]}>{items.length}</Text>
                  </View>
                  <ScrollView style={{ flex: 1 }}>
                    {items.length === 0 ? (
                      <Text style={styles.kanbanEmpty}>Aucune</Text>
                    ) : (
                      items.map((item) => (
                        <InterventionCard key={item.id} item={item} onPress={() => openDetail(item.id)} />
                      ))
                    )}
                  </ScrollView>
                </View>
              );
            })}
          </ScrollView>
        )}
        {error && <Text style={styles.error}>{error}</Text>}
      </View>
    );
  }

  // ---------- Écran : Connexion ----------
  return (
    <View style={styles.screen}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.container}>
        <Text style={styles.loginTitle}>Interventions Clients</Text>
        <TextInput
          style={styles.input}
          placeholder="Login"
          value={login}
          onChangeText={setLogin}
          autoCapitalize="none"
        />
        <TextInput
          style={styles.input}
          placeholder="Mot de passe"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />
        <PrimaryButton title="Se connecter" onPress={handleLogin} />
        {loading && <ActivityIndicator style={{ marginTop: 20 }} />}
        {error && <Text style={styles.error}>{error}</Text>}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#f9fafb', paddingTop: 44 },
  container: { flex: 1, padding: 16 },
  appBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 8,
    backgroundColor: '#f9fafb',
  },
  appBarTitle: { fontSize: 17, fontWeight: '700', color: '#111827' },
  appBarBack: { color: '#3b82f6', fontSize: 15, width: 50 },
  addButtonWrap: { backgroundColor: '#3b82f6', paddingVertical: 6, paddingHorizontal: 12, borderRadius: 20 },
  addButtonText: { color: '#fff', fontWeight: '600', fontSize: 13 },

  toggleRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 10, gap: 8 },
  toggleButton: { paddingVertical: 5, paddingHorizontal: 14, borderRadius: 16, backgroundColor: '#e5e7eb' },
  toggleButtonActive: { backgroundColor: '#111827' },
  toggleText: { color: '#374151', fontSize: 13, fontWeight: '600' },
  toggleTextActive: { color: '#fff', fontSize: 13, fontWeight: '600' },

  loginTitle: { fontSize: 22, fontWeight: 'bold', marginBottom: 24, marginTop: 40, textAlign: 'center', color: '#111827' },

  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    backgroundColor: '#fff',
  },
  error: { marginTop: 12, marginHorizontal: 16, color: '#dc2626', textAlign: 'center' },

  card: {
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#f3f4f6',
    gap: 6,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardTitle: { fontWeight: '700', fontSize: 14, color: '#111827', flexShrink: 1 },
  cardPartner: { color: '#6b7280', fontSize: 13 },

  badgeRow: { flexDirection: 'row', gap: 8, marginBottom: 4 },
  badge: { paddingVertical: 3, paddingHorizontal: 10, borderRadius: 12, alignSelf: 'flex-start' },
  badgeText: { fontSize: 12, fontWeight: '600' },

  label: { fontWeight: '700', marginTop: 16, marginBottom: 4, color: '#374151', fontSize: 13 },
  value: { color: '#111827', fontSize: 15, lineHeight: 20 },

  primaryButton: { paddingVertical: 13, borderRadius: 8, alignItems: 'center' },
  primaryButtonText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  secondaryButton: { paddingVertical: 12, borderRadius: 8, alignItems: 'center', borderWidth: 1.5 },
  secondaryButtonText: { fontWeight: '700', fontSize: 15 },

  selectedPartner: {
    padding: 12,
    backgroundColor: '#eef2ff',
    borderRadius: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  selectedPartnerText: { fontWeight: '600', color: '#3730a3' },
  changeLink: { color: '#3b82f6', fontSize: 13 },
  partnerResult: { padding: 10, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },

  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 16, borderWidth: 1, borderColor: '#d1d5db' },
  chipSelected: { backgroundColor: '#3b82f6', borderColor: '#3b82f6' },
  chipText: { color: '#374151' },
  chipTextSelected: { color: '#fff', fontWeight: '600' },

  kanbanScroll: { flex: 1 },
  kanbanColumn: {
    width: 220,
    marginRight: 10,
    backgroundColor: '#f3f4f6',
    borderRadius: 10,
    padding: 8,
  },
  kanbanColumnHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    marginBottom: 8,
  },
  kanbanColumnTitle: { fontWeight: '700', fontSize: 13 },
  kanbanColumnCount: { fontWeight: '700', fontSize: 13 },
  kanbanEmpty: { color: '#9ca3af', fontSize: 12, textAlign: 'center', marginTop: 10 },
});