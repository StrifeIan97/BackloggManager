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
    View
} from 'react-native';
import Animated, {
    Easing,
    useAnimatedStyle,
    useSharedValue,
    withRepeat,
    withTiming,
} from 'react-native-reanimated';
import { supabase } from '../../supabase/Client/SupaBaseClient';

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

export default function HomeScreen() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
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

    // Sign In (Login) com tratamento de erro limpo
    async function signIn(email: string, password: string) {
        if (!email.trim() || !password) {
            Alert.alert("Atenção", "Preencha e-mail e senha.");
            return;
        }

        setLoading(true);
        try {
            const { data, error } = await supabase.auth.signInWithPassword({ 
                email: email.trim(), 
                password 
            });

            // Se der erro, intercepta e mostra mensagem amigável sem exibir erros técnicos
            if (error) {
                Alert.alert("Acesso negado", "E-mail ou senha incorretos.");
                return;
            }

            console.log('User signed in:', data);
            router.replace("/listajogos"); 
        } catch (err: any) {
            Alert.alert("Erro", "Não foi possível realizar o login no momento. Tente novamente.");
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

            {/* Conteúdo da Tela */}
            <View style={styles.estiloView}>
                <Text style={styles.estilotexto2}>Bem vindo ao Backlogg Manager de ISMS</Text>

                <TextInput 
                    style={styles.inputestilo}
                    placeholder='Email'
                    keyboardType="email-address"
                    placeholderTextColor="#888"
                    autoCapitalize="none"
                    value={email}
                    onChangeText={setEmail}
                />

                <TextInput 
                    style={styles.inputestilo}
                    placeholder='Senha'
                    placeholderTextColor="#888"
                    secureTextEntry={true}
                    autoCapitalize="none"
                    value={password}
                    onChangeText={setPassword}
                />

                <TouchableOpacity 
                    style={[styles.estilobotao, loading && { opacity: 0.7 }]}
                    onPress={() => signIn(email, password)}
                    disabled={loading}
                >
                    {loading ? (
                        <ActivityIndicator color="#fff" />
                    ) : (
                        <Text style={styles.estilotexto}>Fazer Login</Text>
                    )}
                </TouchableOpacity>

                <TouchableOpacity 
                    style={[styles.estilobotao, { backgroundColor: '#334155' }]}
                    onPress={() => router.push("/cadastro")}
                >
                    <Text style={styles.estilotexto}>Fazer Cadastro</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0F172A', // Fundo escuro padrão sólido
    },
    gridContainer: {
        ...StyleSheet.absoluteFill,
        flexDirection: 'row',
        justifyContent: 'space-around',
        opacity: 0.25, // Deixa as capas discretas ao fundo
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
        fontWeight: 'bold'
    },
    estilotexto2: {
        fontSize: 22,
        fontWeight: 'bold',
        color: '#fff',
        marginBottom: 14,
        textAlign: 'center'
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
        color: "#000"
    },
    estilobotao: {
        backgroundColor: '#4895ef',
        paddingVertical: 14,
        width: '100%',
        maxWidth: 400,
        borderRadius: 10,
        alignItems: 'center'
    }
});