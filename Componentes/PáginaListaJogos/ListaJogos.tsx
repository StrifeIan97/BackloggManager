import { Game, formatGamePlatforms, searchGamesByName } from "@/IGDB API/API";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { supabase } from "../../supabase/Client/SupaBaseClient";

interface SavedGame {
  id: string;
  api_id: number;
  name: string;
  cover_url: string | null;
  rating: number | null;
  release_date: number | null;
  status: "terminado" | "jogando" | "quer_jogar";
  completed_year: number | null;
  user_id: string;
}

export default function ListaJogos() {
  const [games, setGames] = useState<Game[]>([]);
  const [savedGames, setSavedGames] = useState<SavedGame[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingSaved, setLoadingSaved] = useState(true);
  const [query, setQuery] = useState("");
  const [anoSelecionado, setAnoSelecionado] = useState<number | "todos">("todos");

  // Estados do Modal de Adicionar Ano (ao zerar da busca)
  const [modalAnoVisivel, setModalAnoVisivel] = useState(false);
  const [jogoParaZerar, setJogoParaZerar] = useState<Game | null>(null);
  const [anoDigitado, setAnoDigitado] = useState(String(new Date().getFullYear()));

  // ⚙️ Estados para o Modal de Ações (Mudar Status / Excluir Jogo Salvo)
  const [modalAcoesVisivel, setModalAcoesVisivel] = useState(false);
  const [jogoSelecionado, setJogoSelecionado] = useState<SavedGame | null>(null);

  const fetchSavedGames = async () => {
    setLoadingSaved(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("jogos")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setSavedGames((data as SavedGame[]) || []);
    } catch (err: any) {
      Alert.alert("Erro", err.message || "Falha ao carregar seus jogos.");
    } finally {
      setLoadingSaved(false);
    }
  };

  useEffect(() => {
    fetchSavedGames();
  }, []);

  const handleSearch = async () => {
    if (!query.trim()) return;
    setLoading(true);
    try {
      const results = await searchGamesByName(query);
      setGames(results);
    } catch (err) {
      console.error(err);
      Alert.alert("Erro", "Falha ao buscar jogos na IGDB.");
    } finally {
      setLoading(false);
    }
  };

  const abrirModalAnoZerado = (item: Game) => {
    setJogoParaZerar(item);
    setAnoDigitado(String(new Date().getFullYear()));
    setModalAnoVisivel(true);
  };

  const confirmarAnoZerado = (ano: number) => {
    if (!jogoParaZerar) return;
    if (isNaN(ano) || ano < 1970 || ano > 2100) {
      Alert.alert("Ano inválido", "Digite um ano válido (ex: 2026).");
      return;
    }
    setModalAnoVisivel(false);
    addGameToSupabase(jogoParaZerar, "terminado", ano);
    setJogoParaZerar(null);
  };

  const addGameToSupabase = async (
    item: Game,
    status: "terminado" | "jogando" | "quer_jogar",
    completedYear: number | null = null
  ) => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        Alert.alert("Erro", "Usuário não autenticado.");
        return;
      }

      const { data: existing, error: checkError } = await supabase
        .from("jogos")
        .select("id")
        .eq("api_id", item.id)
        .eq("user_id", user.id)
        .limit(1);

      if (checkError) throw checkError;

      if (existing && existing.length > 0) {
        Alert.alert("Duplicado", `"${item.name}" já está na sua lista!`);
        return;
      }

      const coverUrl = item.cover?.url
        ? item.cover.url.startsWith("http")
          ? item.cover.url
          : `https:${item.cover.url}`
        : null;

      const { data: inserted, error } = await supabase
        .from("jogos")
        .insert([
          {
            api_id: item.id,
            name: item.name,
            cover_url: coverUrl,
            rating: item.rating ?? null,
            release_date: item.first_release_date ?? null,
            status,
            completed_year: completedYear,
            user_id: user.id,
          },
        ])
        .select()
        .single();

      if (error) throw error;

      if (inserted) {
        setSavedGames((prev) => [inserted as SavedGame, ...prev]);
      }
      setGames([]);
      setQuery("");
      Alert.alert("Sucesso", `"${item.name}" adicionado!`);
    } catch (err: any) {
      Alert.alert("Erro Supabase", err.message || "Erro ao salvar o jogo.");
    }
  };

  // ⚙️ Abrir modal de opções ao segurar o jogo salvo
  const lidarComLongPress = (item: SavedGame) => {
    setJogoSelecionado(item);
    setModalAcoesVisivel(true);
  };

  // 🔄 Alterar o status do jogo salvo diretamente pelo modal
  const alterarStatusJogo = async (novoStatus: "terminado" | "jogando" | "quer_jogar") => {
    if (!jogoSelecionado) return;

    try {
      const updateData: any = {
        status: novoStatus,
        completed_year: novoStatus === "terminado" ? new Date().getFullYear() : null,
      };

      const { error } = await supabase
        .from("jogos")
        .update(updateData)
        .eq("id", jogoSelecionado.id);

      if (error) throw error;

      setModalAcoesVisivel(false);
      setJogoSelecionado(null);
      fetchSavedGames();
    } catch (err: any) {
      Alert.alert("Erro", err.message || "Não foi possível atualizar o status.");
    }
  };

  // 🗑️ Excluir o jogo definitivo pelo modal
  const excluirJogoDefinitivo = async () => {
    if (!jogoSelecionado) return;

    try {
      const { error } = await supabase
        .from("jogos")
        .delete()
        .eq("id", jogoSelecionado.id);

      if (error) throw error;

      setSavedGames((prev) => prev.filter((g) => g.id !== jogoSelecionado.id));
      setModalAcoesVisivel(false);
      setJogoSelecionado(null);
    } catch (err: any) {
      Alert.alert("Erro", err.message || "Não foi possível excluir o jogo.");
    }
  };

  const todosTerminados = savedGames.filter((g) => g.status === "terminado");

  const anosDisponiveis = Array.from(
    new Set(
      todosTerminados
        .map((g) => g.completed_year)
        .filter((ano): ano is number => ano !== null)
    )
  ).sort((a, b) => b - a);

  const terminadosFiltrados =
    anoSelecionado === "todos"
      ? todosTerminados
      : todosTerminados.filter((g) => g.completed_year === anoSelecionado);

  const jogando = savedGames.filter((g) => g.status === "jogando");
  const querJogar = savedGames.filter((g) => g.status === "quer_jogar");

  const renderListaHorizontal = (lista: SavedGame[]) => {
    if (lista.length === 0) {
      return <Text style={styles.vazio}>Nenhum jogo nesta lista.</Text>;
    }

    return (
      <FlatList
        horizontal
        showsHorizontalScrollIndicator={false}
        data={lista}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }:{item: SavedGame}) => (
          <TouchableOpacity
            style={styles.savedCard}
            onLongPress={() => lidarComLongPress(item)}
            activeOpacity={0.7}
          >
            {item.cover_url ? (
              <Image source={{ uri: item.cover_url }} style={styles.cover} />
            ) : (
              <View style={[styles.cover, styles.noCover]}>
                <Text style={{ fontSize: 10, textAlign: "center" }}>Sem capa</Text>
              </View>
            )}
            <Text style={styles.savedTitle} numberOfLines={2}>
              {item.name}
            </Text>
            {item.completed_year && (
              <Text style={styles.anoBadge}>Zerado em {item.completed_year}</Text>
            )}
          </TouchableOpacity>
        )}
      />
    );
  };

  const anoAtual = new Date().getFullYear();
  const atalhosAnos = [anoAtual, anoAtual - 1, anoAtual - 2, anoAtual - 3];

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 40 }}>
      <TextInput
        style={styles.searchBar}
        placeholder="Pesquisar jogo na IGDB..."
        placeholderTextColor="#888" // 👈 Adicione esta linha
        value={query}
        onChangeText={setQuery}
        onSubmitEditing={handleSearch}
      />

      {loading && <ActivityIndicator size="large" style={{ marginVertical: 10 }} />}

      {games.length > 0 && (
        <View style={styles.resultadosContainer}>
          <View style={styles.resultadosHeader}>
            <Text style={styles.subtitulo}>Resultados da busca:</Text>
            <TouchableOpacity onPress={() => setGames([])}>
              <Text style={{ color: "#d9534f", fontWeight: "bold" }}>Fechar</Text>
            </TouchableOpacity>
          </View>

          {games.map((item) => {
            const imageUrl = item.cover?.url
              ? item.cover.url.startsWith("http")
                ? item.cover.url
                : `https:${item.cover.url}`
              : undefined;

            return (
              <View key={item.id} style={styles.item}>
                <View style={{ flexDirection: "row", gap: 12 }}>
                  {imageUrl && <Image source={{ uri: imageUrl }} style={styles.cover} />}
                  <View style={{ flex: 1 }}>
                    <Text style={styles.title}>{item.name}</Text>
                    <Text>Rating: {item.rating ? item.rating.toFixed(1) : "N/A"}</Text>
                    <Text>
                      Release Date:{" "}
                      {item.first_release_date
                        ? new Date(item.first_release_date * 1000).toDateString()
                        : "Unknown"}
                    </Text>
                    <Text style={styles.platformsText} numberOfLines={2}>
                      Plataformas:{" "}
                      {formatGamePlatforms(item.platforms, {
                        useAbbreviation: true,
                        maxItems: 3,
                      })}
                    </Text>
                  </View>
                </View>

                <View style={styles.botoesStatus}>
                  <TouchableOpacity
                    style={[styles.btnStatus, { backgroundColor: "#2ecc71" }]}
                    onPress={() => abrirModalAnoZerado(item)}
                  >
                    <Text style={styles.btnStatusText}>+ Terminado</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.btnStatus, { backgroundColor: "#4895ef" }]}
                    onPress={() => addGameToSupabase(item, "jogando")}
                  >
                    <Text style={styles.btnStatusText}>+ Jogando</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.btnStatus, { backgroundColor: "#f39c12" }]}
                    onPress={() => addGameToSupabase(item, "quer_jogar")}
                  >
                    <Text style={styles.btnStatusText}>+ Quero Jogar</Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          })}
        </View>
      )}

      {loadingSaved ? (
        <ActivityIndicator size="large" style={{ marginTop: 30 }} />
      ) : (
        <>
          <View style={styles.secao}>
            <Text style={styles.textoEstilo}>
              Jogos que você terminou ({terminadosFiltrados.length})
            </Text>

            {anosDisponiveis.length > 0 && (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={{ marginBottom: 10 }}
              >
                <TouchableOpacity
                  style={[styles.chipAno, anoSelecionado === "todos" && styles.chipAnoAtivo]}
                  onPress={() => setAnoSelecionado("todos")}
                >
                  <Text
                    style={[
                      styles.chipTexto,
                      anoSelecionado === "todos" && styles.chipTextoAtivo,
                    ]}
                  >
                    Todos ({todosTerminados.length})
                  </Text>
                </TouchableOpacity>

                {anosDisponiveis.map((ano) => {
                  const qtdNoAno = todosTerminados.filter(
                    (g) => g.completed_year === ano
                  ).length;

                  return (
                    <TouchableOpacity
                      key={ano}
                      style={[styles.chipAno, anoSelecionado === ano && styles.chipAnoAtivo]}
                      onPress={() => setAnoSelecionado(ano)}
                    >
                      <Text
                        style={[
                          styles.chipTexto,
                          anoSelecionado === ano && styles.chipTextoAtivo,
                        ]}
                      >
                        {ano} ({qtdNoAno})
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            )}

            {renderListaHorizontal(terminadosFiltrados)}
          </View>

          <View style={styles.secao}>
            <Text style={styles.textoEstilo}>Jogando atualmente ({jogando.length})</Text>
            {renderListaHorizontal(jogando)}
          </View>

          <View style={styles.secao}>
            <Text style={styles.textoEstilo}>Jogos que você quer jogar ({querJogar.length})</Text>
            {renderListaHorizontal(querJogar)}
          </View>
        </>
      )}

      {/* MODAL PARA ESCOLHER O ANO EM QUE ZEROU (BUSCA) */}
      <Modal visible={modalAnoVisivel} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitulo}>Em que ano você zerou?</Text>
            <Text style={styles.modalSubtitulo}>{jogoParaZerar?.name}</Text>

            <View style={styles.atalhosRow}>
              {atalhosAnos.map((ano) => (
                <TouchableOpacity
                  key={ano}
                  style={styles.btnAtalhoAno}
                  onPress={() => confirmarAnoZerado(ano)}
                >
                  <Text style={styles.btnAtalhoTexto}>{ano}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={{ marginTop: 12, marginBottom: 4, color: "#555" }}>
              Ou digite outro ano:
            </Text>
            <TextInput
              style={styles.inputAno}
              keyboardType="numeric"
              maxLength={4}
              value={anoDigitado}
              onChangeText={setAnoDigitado}
            />

            <View style={styles.modalAcoes}>
              <TouchableOpacity
                style={[styles.btnModal, { backgroundColor: "#ccc" }]}
                onPress={() => setModalAnoVisivel(false)}
              >
                <Text style={{ fontWeight: "bold" }}>Cancelar</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.btnModal, { backgroundColor: "#2ecc71" }]}
                onPress={() => confirmarAnoZerado(Number(anoDigitado))}
              >
                <Text style={{ color: "#fff", fontWeight: "bold" }}>Salvar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ⚙️ MODAL DE AÇÕES AO SEGURAR O JOGO SALVO (Mudar Status ou Excluir) */}
      <Modal visible={modalAcoesVisivel} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitulo}>Gerenciar Jogo</Text>
            <Text style={styles.modalSubtitulo}>{jogoSelecionado?.name}</Text>

            <Text style={styles.labelOpcao}>Mover para:</Text>
            
            {jogoSelecionado?.status !== "terminado" && (
              <TouchableOpacity
                style={[styles.btnAcaoLista, { backgroundColor: "#2ecc71" }]}
                onPress={() => alterarStatusJogo("terminado")}
              >
                <Text style={styles.btnAcaoTexto}>🏆 Marcar como Terminado</Text>
              </TouchableOpacity>
            )}

            {jogoSelecionado?.status !== "jogando" && (
              <TouchableOpacity
                style={[styles.btnAcaoLista, { backgroundColor: "#4895ef" }]}
                onPress={() => alterarStatusJogo("jogando")}
              >
                <Text style={styles.btnAcaoTexto}>🎮 Mover para Jogando</Text>
              </TouchableOpacity>
            )}

            {jogoSelecionado?.status !== "quer_jogar" && (
              <TouchableOpacity
                style={[styles.btnAcaoLista, { backgroundColor: "#f39c12" }]}
                onPress={() => alterarStatusJogo("quer_jogar")}
              >
                <Text style={styles.btnAcaoTexto}>⏳ Mover para Quero Jogar</Text>
              </TouchableOpacity>
            )}

            <View style={styles.divisorModal} />

            <TouchableOpacity
              style={[styles.btnAcaoLista, { backgroundColor: "#d9534f" }]}
              onPress={excluirJogoDefinitivo}
            >
              <Text style={styles.btnAcaoTexto}>🗑️ Excluir Jogo</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.btnModalCancelar]}
              onPress={() => setModalAcoesVisivel(false)}
            >
              <Text style={{ fontWeight: "bold", color: "#666" }}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, marginTop: 50, paddingHorizontal: 20 },
  searchBar: {
    height: 45,
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    paddingHorizontal: 12,
    backgroundColor: "#fff",
    marginBottom: 10,
    color: "#000"
  },
  resultadosContainer: { marginBottom: 20 },
  resultadosHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  subtitulo: { fontSize: 16, fontWeight: "bold" },
  item: { marginBottom: 12, padding: 12, backgroundColor: "#f0f0f0", borderRadius: 8 },
  title: { fontSize: 16, fontWeight: "bold", marginBottom: 4 },
  cover: { width: 90, height: 125, borderRadius: 8 },
  noCover: { backgroundColor: "#ddd", justifyContent: "center", alignItems: "center" },
  botoesStatus: { flexDirection: "row", justifyContent: "space-between", marginTop: 10, gap: 6 },
  btnStatus: { flex: 1, paddingVertical: 8, borderRadius: 6, alignItems: "center" },
  btnStatusText: { color: "#fff", fontWeight: "bold", fontSize: 12 },
  secao: { marginTop: 18 },
  textoEstilo: { fontSize: 18, fontWeight: "bold", marginBottom: 8 },
  vazio: { color: "#888", fontStyle: "italic" },
  savedCard: { width: 100, marginRight: 12 },
  savedTitle: { fontSize: 12, fontWeight: "600", marginTop: 4 },
  anoBadge: { fontSize: 11, color: "#2ecc71", fontWeight: "bold", marginTop: 2 },
  chipAno: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: "#e0e0e0",
    marginRight: 8,
  },
  chipAnoAtivo: { backgroundColor: "#2ecc71" },
  chipTexto: { fontSize: 13, fontWeight: "600", color: "#333" },
  chipTextoAtivo: { color: "#fff" },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalBox: {
    width: "100%",
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 20,
  },
  modalTitulo: { fontSize: 18, fontWeight: "bold", marginBottom: 4 },
  modalSubtitulo: { fontSize: 14, color: "#666", marginBottom: 14 },
  atalhosRow: { flexDirection: "row", justifyContent: "space-between", gap: 8 },
  btnAtalhoAno: {
    flex: 1,
    backgroundColor: "#4895ef",
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: "center",
  },
  btnAtalhoTexto: { color: "#fff", fontWeight: "bold" },
  inputAno: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    padding: 10,
    fontSize: 16,
    textAlign: "center",
  },
  modalAcoes: { flexDirection: "row", justifyContent: "flex-end", gap: 10, marginTop: 16 },
  btnModal: { paddingVertical: 10, paddingHorizontal: 18, borderRadius: 8 },
  labelOpcao: { fontSize: 13, fontWeight: "600", color: "#444", marginBottom: 8 },
  btnAcaoLista: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 8,
    alignItems: "center",
    marginBottom: 8,
  },
  btnAcaoTexto: { color: "#fff", fontWeight: "bold", fontSize: 13 },
  divisorModal: { height: 1, backgroundColor: "#eee", marginVertical: 8 },
  btnModalCancelar: {
    alignItems: "center",
    paddingVertical: 8,
    marginTop: 4,
  },
  platformsText: {
    fontSize: 12,
    color: "#555",
    marginTop: 4,
  },
});