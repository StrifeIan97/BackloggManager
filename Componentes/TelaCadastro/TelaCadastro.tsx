import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Image,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { supabase } from '../../supabase/Client/SupaBaseClient'; // Ajuste o caminho se necessário

const { height } = Dimensions.get('window');

// Capas de exemplo para o fundo dinâmico gamer
const COLUMNS = [
  [
    "https://images.igdb.com/igdb/image/upload/t_cover_big/co1wyy.png",
    "https://images.igdb.com/igdb/image/upload/t_cover_big/co2lqt.png",
    "https://images.igdb.com/igdb/image/upload/t_cover_big/co39zz.png",
  ],
  [
    "https://images.igdb.com/igdb/image/upload/t_cover_big/co49xa.png",
    "https://images.igdb.com/igdb/image/upload/t_cover_big/co1vzz.png",
    "https://images.igdb.com/igdb/image/upload/t_cover_big/co2dtv.png",
  ],
  [
    "https://images.igdb.com/igdb/image/upload/t_cover_big/co1tnw.png",
    "https://images.igdb.com/igdb/image/upload/t_cover_big/co2mvt.png",
    "https://images.igdb.com/igdb/image/upload/t_cover_big/co1r7f.png",
  ],
];

export default function TelaCadastro() {
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  // Animação do fundo dinâmico
  const translateY1 = useSharedValue(0);
  const translateY2 = useSharedValue(-height);

  useEffect(() => {
    translateY1.value = withRepeat(
      withTiming(height, { duration: 25000, easing: Easing.linear }),
      -1,
      false
    );
    translateY2.value = withRepeat(
      withTiming(0, { duration: 25000, easing: Easing.linear }),
      -1,
      false
    );
  }, []);

  const animatedStyle1 = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY1.value }],
  }));

  const animatedStyle2 = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY2.value }],
  }));

  async function handleSignUp() {
    // 1. Validações básicas antes de chamar o Supabase
    if (!email.trim() || !username.trim() || !password || !confirmPassword) {
      Alert.alert('Atenção', 'Preencha todos os campos.');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Erro', 'As senhas não coincidem.');
      return;
    }

    if (password.length < 6) {
      Alert.alert('Senha fraca', 'A senha deve ter pelo menos 6 caracteres.');
      return;
    }

    setLoading(true);
    try {
      // 2. Cria o usuário no Supabase Auth salvando o nome em display_name
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: {
            display_name: username.trim(),
          },
        },
      });

      if (error) {
        Alert.alert('Erro no cadastro', error.message);
        return;
      }

      // 3. Se "Confirm email" estiver desativado, já entra logado; senão volta para o login
      if (data.session) {
        Alert.alert('Sucesso', 'Conta criada com sucesso!');
        router.replace('/listajogos');
      } else {
        Alert.alert(
          'Cadastro realizado',
          'Verifique seu e-mail para confirmar a conta e faça login.'
        );
        router.replace('/homescreen');
      }
    } catch (err: any) {
      Alert.alert('Erro', err.message || 'Ocorreu um erro ao cadastrar.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.container}>
      {/* Fundo Dinâmico com Capas de Jogos Animadas */}
      <View style={styles.gridContainer}>
        {COLUMNS.map((col, colIndex) => (
          <View key={colIndex} style={styles.column}>
            <Animated.View style={[styles.animatedColumn, animatedStyle1]}>
              {col.map((img, i) => (
                <Image key={`1-${i}`} source={{ uri: img }} style={styles.coverImage} />
              ))}
              {col.map((img, i) => (
                <Image key={`1-dup-${i}`} source={{ uri: img }} style={styles.coverImage} />
              ))}
            </Animated.View>

            <Animated.View style={[styles.animatedColumn, animatedStyle2]}>
              {col.map((img, i) => (
                <Image key={`2-${i}`} source={{ uri: img }} style={styles.coverImage} />
              ))}
              {col.map((img, i) => (
                <Image key={`2-dup-${i}`} source={{ uri: img }} style={styles.coverImage} />
              ))}
            </Animated.View>
          </View>
        ))}
      </View>

      {/* Conteúdo da Tela de Cadastro */}
      <View style={styles.estiloView}>
        <Text style={styles.estilotexto2}>Criar Nova Conta</Text>

        <TextInput
          style={styles.inputestilo}
          placeholder="Email"
          placeholderTextColor="#888"
          keyboardType="email-address"
          autoCapitalize="none"
          value={email}
          onChangeText={setEmail}
        />

        <TextInput
          style={styles.inputestilo}
          placeholder="Nome de usuário"
          placeholderTextColor="#888"
          autoCapitalize="words"
          value={username}
          onChangeText={setUsername}
        />

        <TextInput
          style={styles.inputestilo}
          placeholder="Senha"
          placeholderTextColor="#888"
          secureTextEntry={true}
          autoCapitalize="none"
          value={password}
          onChangeText={setPassword}
        />

        <TextInput
          style={styles.inputestilo}
          placeholder="Confirmar a Senha"
          placeholderTextColor="#888"
          secureTextEntry={true}
          autoCapitalize="none"
          value={confirmPassword}
          onChangeText={setConfirmPassword}
        />

        <TouchableOpacity
          style={[styles.estilobotao, loading && { opacity: 0.7 }]}
          onPress={handleSignUp}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.estilotexto}>Cadastrar</Text>
          )}
        </TouchableOpacity>

        {/* Botão opcional para voltar ao login se o usuário já tiver conta */}
        <TouchableOpacity
          style={[styles.estilobotao, { backgroundColor: '#334155', marginTop: 6 }]}
          onPress={() => router.back()}
        >
          <Text style={styles.estilotexto}>Voltar para o Login</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  gridContainer: {
    ...StyleSheet.absoluteFill,
    flexDirection: 'row',
    justifyContent: 'space-around',
    opacity: 0.25,
    overflow: 'hidden',
  },
  column: {
    width: Dimensions.get('window').width / 3.2,
    overflow: 'hidden',
  },
  animatedColumn: {
    position: 'absolute',
    width: '100%',
  },
  coverImage: {
    width: '100%',
    height: 170,
    borderRadius: 8,
    marginBottom: 12,
    resizeMode: 'cover',
  },
  estiloView: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    paddingHorizontal: 20,
    gap: 12,
    zIndex: 10,
  },
  estilotexto: {
    fontSize: 18,
    color: '#fff',
    fontWeight: 'bold',
  },
  estilotexto2: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 10,
    textAlign: 'center',
  },
  inputestilo: {
    backgroundColor: '#fff',
    width: '100%',
    maxWidth: 400,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    fontSize: 16,
    color: "#000",
  },
  estilobotao: {
    backgroundColor: '#4895ef',
    paddingVertical: 14,
    width: '100%',
    maxWidth: 400,
    borderRadius: 10,
    alignItems: 'center',
  },
});