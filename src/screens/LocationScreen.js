import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TextInput, ActivityIndicator, Alert } from 'react-native';
import TouchableOpacity from '../components/TouchableOpacity';
import { ArrowLeftIcon, CheckCircleIcon, MagnifyingGlassIcon, MapPinIcon } from 'phosphor-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS, SPACING, RADIUS } from '../theme';
import { useUser } from '../context/UserContext';

const ESTADOS = [
  { sigla: 'AC', nome: 'Acre' }, { sigla: 'AL', nome: 'Alagoas' }, { sigla: 'AP', nome: 'Amapá' },
  { sigla: 'AM', nome: 'Amazonas' }, { sigla: 'BA', nome: 'Bahia' }, { sigla: 'CE', nome: 'Ceará' },
  { sigla: 'DF', nome: 'Distrito Federal' }, { sigla: 'ES', nome: 'Espírito Santo' }, { sigla: 'GO', nome: 'Goiás' },
  { sigla: 'MA', nome: 'Maranhão' }, { sigla: 'MT', nome: 'Mato Grosso' }, { sigla: 'MS', nome: 'Mato Grosso do Sul' },
  { sigla: 'MG', nome: 'Minas Gerais' }, { sigla: 'PA', nome: 'Pará' }, { sigla: 'PB', nome: 'Paraíba' },
  { sigla: 'PR', nome: 'Paraná' }, { sigla: 'PE', nome: 'Pernambuco' }, { sigla: 'PI', nome: 'Piauí' },
  { sigla: 'RJ', nome: 'Rio de Janeiro' }, { sigla: 'RN', nome: 'Rio Grande do Norte' }, { sigla: 'RS', nome: 'Rio Grande do Sul' },
  { sigla: 'RO', nome: 'Rondônia' }, { sigla: 'RR', nome: 'Roraima' }, { sigla: 'SC', nome: 'Santa Catarina' },
  { sigla: 'SP', nome: 'São Paulo' }, { sigla: 'SE', nome: 'Sergipe' }, { sigla: 'TO', nome: 'Tocantins' },
];

export default function LocationScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { user, updateLocation } = useUser();

  const [step, setStep] = useState('estado'); // 'estado' | 'cidade'
  const [selectedEstado, setSelectedEstado] = useState(null);
  const [query, setQuery] = useState('');
  const [cidades, setCidades] = useState([]);
  const [loadingCidades, setLoadingCidades] = useState(false);
  const [errorCidades, setErrorCidades] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user?.estado) {
      const found = ESTADOS.find(e => e.sigla === user.estado);
      if (found) setSelectedEstado(found);
    }
  }, [user?.estado]);

  const filteredEstados = ESTADOS.filter(e =>
    e.nome.toLowerCase().includes(query.toLowerCase()) || e.sigla.toLowerCase().includes(query.toLowerCase())
  );

  const filteredCidades = cidades.filter(c => c.nome.toLowerCase().includes(query.toLowerCase()));

  const openEstado = async (estado) => {
    setSelectedEstado(estado);
    setStep('cidade');
    setQuery('');
    setLoadingCidades(true);
    setErrorCidades(false);
    try {
      const res = await fetch(`https://servicodados.ibge.gov.br/api/v1/localidades/estados/${estado.sigla}/municipios`);
      const data = await res.json();
      setCidades((data ?? []).map(c => ({ id: c.id, nome: c.nome })));
    } catch (_) {
      setErrorCidades(true);
    } finally {
      setLoadingCidades(false);
    }
  };

  const chooseCidade = async (cidade) => {
    setSaving(true);
    try {
      await updateLocation(selectedEstado.sigla, cidade.nome);
      navigation.goBack();
    } catch (e) {
      Alert.alert('Erro', e.message || 'Não foi possível salvar sua localização agora.');
    } finally {
      setSaving(false);
    }
  };

  const handleBack = () => {
    if (step === 'cidade') {
      setStep('estado');
      setQuery('');
    } else {
      navigation.goBack();
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.bg }}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity onPress={handleBack} style={styles.backBtn}>
          <ArrowLeftIcon size={20} color={COLORS.white} weight="regular" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{step === 'estado' ? 'Seu estado' : selectedEstado?.nome}</Text>
        <View style={{ width: 38 }} />
      </View>

      <View style={styles.searchWrap}>
        <MagnifyingGlassIcon size={18} color={COLORS.gray} weight="regular" />
        <TextInput
          style={styles.searchInput}
          value={query}
          onChangeText={setQuery}
          placeholder={step === 'estado' ? 'Buscar estado...' : 'Buscar cidade...'}
          placeholderTextColor={COLORS.grayDark}
          autoCorrect={false}
        />
      </View>

      {step === 'estado' && (
        <FlatList
          data={filteredEstados}
          keyExtractor={(item) => item.sigla}
          contentContainerStyle={{ padding: SPACING.md, paddingBottom: 40 }}
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.row} onPress={() => openEstado(item)} activeOpacity={0.7}>
              <View style={{ flex: 1 }}>
                <Text style={styles.rowTitle}>{item.nome}</Text>
                <Text style={styles.rowSub}>{item.sigla}</Text>
              </View>
              {user?.estado === item.sigla && <CheckCircleIcon size={20} color={COLORS.purpleLight} weight="fill" />}
            </TouchableOpacity>
          )}
        />
      )}

      {step === 'cidade' && (
        <>
          {loadingCidades && (
            <View style={{ padding: 24, alignItems: 'center' }}>
              <ActivityIndicator color={COLORS.purpleLight} />
            </View>
          )}
          {errorCidades && !loadingCidades && (
            <View style={{ padding: 24, alignItems: 'center' }}>
              <Text style={{ color: COLORS.gray, fontSize: 13, textAlign: 'center' }}>
                Não foi possível carregar as cidades. Verifique sua conexão e tente novamente.
              </Text>
            </View>
          )}
          {!loadingCidades && !errorCidades && (
            <FlatList
              data={filteredCidades}
              keyExtractor={(item) => String(item.id)}
              contentContainerStyle={{ padding: SPACING.md, paddingBottom: 40 }}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.row}
                  onPress={() => chooseCidade(item)}
                  activeOpacity={0.7}
                  disabled={saving}
                >
                  <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <MapPinIcon size={16} color={COLORS.gray} weight="regular" />
                    <Text style={styles.rowTitle}>{item.nome}</Text>
                  </View>
                  {user?.cidade === item.nome && user?.estado === selectedEstado?.sigla && (
                    <CheckCircleIcon size={20} color={COLORS.purpleLight} weight="fill" />
                  )}
                </TouchableOpacity>
              )}
            />
          )}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: SPACING.md, paddingBottom: 12 },
  backBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: COLORS.card, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: COLORS.border },
  headerTitle: { color: COLORS.white, fontSize: 17, fontWeight: '800' },

  searchWrap: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: COLORS.card, borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.border, paddingHorizontal: 14, marginHorizontal: SPACING.md, marginBottom: SPACING.sm },
  searchInput: { flex: 1, color: COLORS.white, fontSize: 15, fontWeight: '600', paddingVertical: 12 },

  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: COLORS.card, borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.border, padding: 14, marginBottom: 8 },
  rowTitle: { color: COLORS.white, fontSize: 15, fontWeight: '700' },
  rowSub: { color: COLORS.gray, fontSize: 12, marginTop: 2 },
});
