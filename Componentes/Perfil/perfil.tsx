import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { supabase } from "../../supabase/Client/SupaBaseClient"; // Ajuste o caminho se necessário

export default function Perfil() {
  const [isModalVisible, setModalVisible] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);

  // Dados do perfil
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [bio, setBio] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  // Estados de edição no modal (Perfil e Senha)
  const [editName, setEditName] = useState("");
  const [editBio, setEditBio] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPasswords, setShowPasswords] = useState(false);

  // Estatísticas do backlog
  const [stats, setStats] = useState({
    terminados: 0,
    jogando: 0,
    querJogar: 0,
  });

  useEffect(() => {
    carregarPerfilEEstatisticas();
  }, []);

  const carregarPerfilEEstatisticas = async () => {
    setLoading(true);
    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) throw userError;

      if (user) {
        setEmail(user.email || "");

        const nomeSalvo =
          user.user_metadata?.display_name ||
          user.user_metadata?.name ||
          user.email?.split("@")[0] ||
          "Jogador";

        const bioSalva = user.user_metadata?.bio || "Sem bio definida ainda.";
        const fotoSalva = user.user_metadata?.avatar_url || null;

        setName(nomeSalvo);
        setBio(bioSalva);
        setAvatarUrl(fotoSalva);

        // Busca a contagem de jogos do usuário na tabela 'jogos'
        const { data: jogos, error: jogosError } = await supabase
          .from("jogos")
          .select("status")
          .eq("user_id", user.id);

        if (!jogosError && jogos) {
          setStats({
            terminados: jogos.filter((j) => j.status === "terminado").length,
            jogando: jogos.filter((j) => j.status === "jogando").length,
            querJogar: jogos.filter((j) => j.status === "quer_jogar").length,
          });
        }
      }
    } catch (err: any) {
      Alert.alert("Erro", err.message || "Falha ao carregar perfil.");
    } finally {
      setLoading(false);
    }
  };

  // 🖼️ Função de upload usando ArrayBuffer puro (100% compatível com Supabase Storage e Expo)
  const escolherEEnviarFoto = async () => {
    const permissao = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permissao.granted) {
      Alert.alert("Permissão negada", "Precisamos de acesso à galeria para alterar a foto.");
      return;
    }

    const resultado = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (resultado.canceled) return;

    const imagemSelecionada = resultado.assets[0];
    setUploadingImage(true);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const uri = imagemSelecionada.uri;
      const fileExt = uri.split(".").pop()?.toLowerCase() || "jpg";
      const fileName = `${user.id}-${Date.now()}.${fileExt}`;

      // 1. Converte a imagem local para ArrayBuffer usando fetch
      const response = await fetch(uri);
      const arrayBuffer = await response.arrayBuffer();

      // 2. Envia o ArrayBuffer binário puro com contentType correto
      const { error: uploadError } = await supabase.storage
        .from("foto-perfil")
        .upload(fileName, arrayBuffer, {
          upsert: true,
          contentType: fileExt === "png" ? "image/png" : "image/jpeg",
        });

      if (uploadError) throw uploadError;

      const { data: publicData } = supabase.storage
        .from("foto-perfil")
        .getPublicUrl(fileName);

      const novaUrl = `${publicData.publicUrl}?t=${new Date().getTime()}`;

      // 3. Salva a URL oficial nos metadados do usuário no Auth
      const { error: updateError } = await supabase.auth.updateUser({
        data: { avatar_url: novaUrl },
      });

      if (updateError) throw updateError;

      setAvatarUrl(novaUrl);
      Alert.alert("Sucesso", "Foto de perfil atualizada!");
    } catch (err: any) {
      console.error("Erro upload:", err);
      Alert.alert("Erro no upload", err.message || "Não foi possível enviar a imagem.");
      carregarPerfilEEstatisticas();
    } finally {
      setUploadingImage(false);
    }
  };

  const abrirModalEdicao = () => {
    setEditName(name);
    setEditBio(bio === "Sem bio definida ainda." ? "" : bio);
    // Limpa campos de senha ao abrir o modal
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setShowPasswords(false);
    setModalVisible(true);
  };

  const salvarPerfil = async () => {
    if (!editName.trim()) {
      Alert.alert("Atenção", "O nome de usuário não pode ficar vazio.");
      return;
    }

    // Validação da troca de senha (caso o usuário tenha preenchido algum campo)
    const isChangingPassword =
      currentPassword.length > 0 || newPassword.length > 0 || confirmPassword.length > 0;

    if (isChangingPassword) {
      if (!currentPassword) {
        Alert.alert("Senha atual", "Informe sua senha atual para poder definir uma nova.");
        return;
      }
      if (newPassword.length < 6) {
        Alert.alert("Senha fraca", "A nova senha deve ter pelo menos 6 caracteres.");
        return;
      }
      if (newPassword !== confirmPassword) {
        Alert.alert("Senhas diferentes", "A nova senha e a confirmação não coincidem.");
        return;
      }
    }

    setSaving(true);
    try {
      const novoNome = editName.trim();
      const novaBio = editBio.trim() || "Sem bio definida ainda.";

      // 1. Atualiza dados básicos no Auth metadata
      const { error: updateError } = await supabase.auth.updateUser({
        data: {
          display_name: novoNome,
          bio: novaBio,
        },
      });

      if (updateError) throw updateError;

      // 2. Se houver tentativa de alteração de senha, valida a senha atual reautenticando e atualiza
      if (isChangingPassword) {
        const { error: reauthError } = await supabase.auth.signInWithPassword({
          email: email,
          password: currentPassword,
        });

        if (reauthError) {
          throw new Error("A senha atual informada está incorreta.");
        }

        const { error: passwordError } = await supabase.auth.updateUser({
          password: newPassword,
        });

        if (passwordError) throw passwordError;
      }

      setName(novoNome);
      setBio(novaBio);
      setModalVisible(false);
      Alert.alert(
        "Sucesso",
        isChangingPassword
          ? "Perfil e senha atualizados com sucesso!"
          : "Perfil atualizado com sucesso!"
      );
    } catch (err: any) {
      Alert.alert("Erro ao salvar", err.message || "Não foi possível atualizar o perfil.");
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = async () => {
    Alert.alert("Sair da conta", "Tem certeza que deseja sair?", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Sair",
        style: "destructive",
        onPress: async () => {
          await supabase.auth.signOut();
          router.replace("/homescreen");
        },
      },
    ]);
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#4895ef" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.profileCard}>
        {/* Avatar com suporte a Foto do Storage ou Iniciais (Fundo azul removido quando há imagem) */}
        <TouchableOpacity
          style={[
            styles.avatarContainer,
            avatarUrl ? { backgroundColor: "transparent" } : null,
          ]}
          onPress={escolherEEnviarFoto}
        >
          {avatarUrl ? (
            <Image source={{ uri: avatarUrl }} style={styles.avatarImage} />
          ) : (
            <View style={styles.avatarFallback}>
              <Text style={styles.avatarText}>
                {name ? name.charAt(0).toUpperCase() : "U"}
              </Text>
            </View>
          )}

          {/* Badge de câmera sobreposto */}
          <View style={styles.cameraIconBadge}>
            {uploadingImage ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Ionicons name="camera" size={14} color="#fff" />
            )}
          </View>
        </TouchableOpacity>

        <Text style={styles.title}>{name}</Text>
        <Text style={styles.email}>{email}</Text>
        <Text style={styles.bio}>{bio}</Text>

        {/* Estatísticas do Backlog */}
        <View style={styles.statsContainer}>
          <View style={styles.statBox}>
            <Text style={[styles.statNumber, { color: "#2ecc71" }]}>
              {stats.terminados}
            </Text>
            <Text style={styles.statLabel}>Terminados</Text>
          </View>

          <View style={styles.statDivider} />

          <View style={styles.statBox}>
            <Text style={[styles.statNumber, { color: "#4895ef" }]}>
              {stats.jogando}
            </Text>
            <Text style={styles.statLabel}>Jogando</Text>
          </View>

          <View style={styles.statDivider} />

          <View style={styles.statBox}>
            <Text style={[styles.statNumber, { color: "#f39c12" }]}>
              {stats.querJogar}
            </Text>
            <Text style={styles.statLabel}>Quero Jogar</Text>
          </View>
        </View>

        <TouchableOpacity style={styles.btnEditar} onPress={abrirModalEdicao}>
          <Ionicons name="create-outline" size={20} color="#fff" />
          <Text style={styles.btnEditarText}>Editar Perfil</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={styles.btnSair} onPress={handleLogout}>
        <Ionicons name="log-out-outline" size={20} color="#d9534f" />
        <Text style={styles.btnSairText}>Sair da Conta</Text>
      </TouchableOpacity>

      {/* Modal de Edição (Perfil e Senha) */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={isModalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContentContainer}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.modalTitle}>Editar Perfil</Text>

              <Text style={styles.label}>Nome de usuário</Text>
              <TextInput
                style={styles.input}
                value={editName}
                onChangeText={setEditName}
                placeholder="Seu nome"
                placeholderTextColor="#888"
              />

              <Text style={styles.label}>Bio</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={editBio}
                onChangeText={setEditBio}
                placeholder="Fale um pouco sobre seus jogos favoritos..."
                placeholderTextColor="#888"
                multiline
                numberOfLines={3}
              />

              {/* Seção de Alteração de Senha */}
              <View style={styles.passwordSectionHeader}>
                <Text style={styles.subHeaderTitle}>Alterar Senha</Text>
                <TouchableOpacity onPress={() => setShowPasswords(!showPasswords)}>
                  <Text style={styles.toggleText}>
                    {showPasswords ? "Ocultar" : "Mostrar"}
                  </Text>
                </TouchableOpacity>
              </View>
              <Text style={styles.helperText}>
                Preencha apenas se desejar alterar sua senha atual.
              </Text>

              <Text style={styles.label}>Senha Atual</Text>
              <TextInput
                style={styles.input}
                value={currentPassword}
                onChangeText={setCurrentPassword}
                placeholder="Digite sua senha atual"
                placeholderTextColor="#888"
                secureTextEntry={!showPasswords}
                autoCapitalize="none"
              />

              <Text style={styles.label}>Nova Senha</Text>
              <TextInput
                style={styles.input}
                value={newPassword}
                onChangeText={setNewPassword}
                placeholder="Mínimo de 6 caracteres"
                placeholderTextColor="#888"
                secureTextEntry={!showPasswords}
                autoCapitalize="none"
              />

              <Text style={styles.label}>Confirmar Nova Senha</Text>
              <TextInput
                style={styles.input}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                placeholder="Repita a nova senha"
                placeholderTextColor="#888"
                secureTextEntry={!showPasswords}
                autoCapitalize="none"
              />

              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={[styles.modalBtn, { backgroundColor: "#ccc" }]}
                  onPress={() => setModalVisible(false)}
                  disabled={saving}
                >
                  <Text style={{ fontWeight: "bold", color: "#333" }}>Cancelar</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.modalBtn, { backgroundColor: "#4895ef" }]}
                  onPress={salvarPerfil}
                  disabled={saving}
                >
                  {saving ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <Text style={{ fontWeight: "bold", color: "#fff" }}>Salvar</Text>
                  )}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  container: {
    flex: 1,
    backgroundColor: "#f5f6fa",
    padding: 20,
    justifyContent: "space-between",
  },
  profileCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 24,
    alignItems: "center",
    marginTop: 20,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  avatarContainer: {
    position: "relative",
    marginBottom: 14,
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: "#4895ef",
    justifyContent: "center",
    alignItems: "center",
  },
  avatarFallback: {
    width: "100%",
    height: "100%",
    borderRadius: 45,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#4895ef",
  },
  avatarImage: {
    width: 90,
    height: 90,
    borderRadius: 45,
    position: "absolute",
    top: 0,
    left: 0,
  },
  avatarText: {
    fontSize: 36,
    fontWeight: "bold",
    color: "#fff",
  },
  cameraIconBadge: {
    position: "absolute",
    bottom: 0,
    right: 0,
    backgroundColor: "#333",
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#fff",
    zIndex: 10,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#222",
  },
  email: {
    fontSize: 14,
    color: "#777",
    marginTop: 2,
    marginBottom: 12,
  },
  bio: {
    fontSize: 15,
    color: "#444",
    textAlign: "center",
    marginBottom: 20,
    lineHeight: 21,
  },
  statsContainer: {
    flexDirection: "row",
    width: "100%",
    backgroundColor: "#f8f9fa",
    borderRadius: 12,
    paddingVertical: 14,
    marginBottom: 20,
  },
  statBox: {
    flex: 1,
    alignItems: "center",
  },
  statNumber: {
    fontSize: 22,
    fontWeight: "bold",
  },
  statLabel: {
    fontSize: 12,
    color: "#666",
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    backgroundColor: "#e0e0e0",
  },
  btnEditar: {
    flexDirection: "row",
    backgroundColor: "#4895ef",
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 10,
    alignItems: "center",
    gap: 8,
    width: "100%",
    justifyContent: "center",
  },
  btnEditarText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  btnSair: {
    flexDirection: "row",
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#d9534f",
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginBottom: 20,
  },
  btnSairText: {
    color: "#d9534f",
    fontSize: 16,
    fontWeight: "bold",
  },
  modalOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.5)",
    padding: 20,
  },
  modalContentContainer: {
    width: "100%",
    maxHeight: "85%",
    backgroundColor: "white",
    padding: 22,
    borderRadius: 14,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 15,
    color: "#222",
  },
  passwordSectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 10,
  },
  subHeaderTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#334155",
  },
  toggleText: {
    fontSize: 14,
    color: "#4895ef",
    fontWeight: "600",
  },
  helperText: {
    fontSize: 12,
    color: "#64748B",
    marginBottom: 10,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#555",
    marginBottom: 4,
    marginTop: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    padding: 12,
    marginBottom: 10,
    borderRadius: 8,
    fontSize: 16,
    backgroundColor: "#fff",
    color: "#000",
  },
  textArea: {
    height: 70,
    textAlignVertical: "top",
  },
  modalButtons: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 10,
    marginTop: 16,
    marginBottom: 10,
  },
  modalBtn: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    minWidth: 95,
    alignItems: "center",
  },
});