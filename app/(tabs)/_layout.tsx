import { Ionicons } from '@expo/vector-icons';
import { User } from '@supabase/supabase-js';
import { Stack, router, useSegments } from "expo-router";
import { useEffect, useState } from 'react';
import { ActivityIndicator, TouchableOpacity, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { supabase } from '../../supabase/Client/SupaBaseClient'; // Ajuste o caminho se necessário

export default function Layout() {
  const [nomeUsuario, setNomeUsuario] = useState<string>('');
  const [loadingSession, setLoadingSession] = useState(true);
  const segments = useSegments();

  // Extrai o display_name/name ou usa o início do e-mail com a primeira letra maiúscula
  const extrairNome = (user: User | null | undefined): string => {
    if (!user) return '';

    const metaNome =
      user.user_metadata?.display_name ||
      user.user_metadata?.name ||
      user.user_metadata?.username;

    if (metaNome) return metaNome;

    if (user.email) {
      const prefixo = user.email.split('@')[0];
      return prefixo.charAt(0).toUpperCase() + prefixo.slice(1);
    }

    return '';
  };

  // Verifica se o usuário já está logado ao abrir o app
  useEffect(() => {
    const verificarSessaoInicial = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session?.user) {
          setNomeUsuario(extrairNome(session.user));
          
          // Se estiver na tela de login/homescreen ou cadastro, joga direto pro jogo/listagem
          const rotaAtual = segments[segments.length - 1];
          if (!rotaAtual || rotaAtual === "homescreen" || rotaAtual === "cadastro") {
            router.replace("/listajogos");
          }
        }
      } catch (err) {
        console.error("Erro ao verificar sessão:", err);
      } finally {
        setLoadingSession(false);
      }
    };

    verificarSessaoInicial();

    // Escuta mudanças de login/logout em tempo real
    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setNomeUsuario(extrairNome(session.user));
      } else {
        setNomeUsuario('');
        // Se deslogou, manda para a homescreen de login
        router.replace("/homescreen");
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  // Mostra um loading rápido enquanto valida se há sessão salva no celular
  if (loadingSession) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#f5f6fa" }}>
        <ActivityIndicator size="large" color="#4895ef" />
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <Stack>
        <Stack.Screen
          name="homescreen"
          options={{
            title: "Página Inicial",
            headerStyle: { backgroundColor: '#4895ef' },
            headerTintColor: '#fff'
          }}
        />

        <Stack.Screen
          name="cadastro"
          options={{
            title: "Cadastre-se",
            headerStyle: { backgroundColor: '#4895ef' },
            headerTintColor: '#fff'
          }}
        />

        <Stack.Screen
          name="perfil"
          options={{
            title: "Meu Perfil",
            headerStyle: { backgroundColor: '#4895ef' },
            headerTintColor: '#fff',
          }}
        />

        <Stack.Screen
          name="listajogos"
          options={{
            title: nomeUsuario ? `Bem vindo: ${nomeUsuario}` : "Bem vindo:",
            headerStyle: { backgroundColor: '#4895ef' },
            headerTintColor: '#fff',
            headerLeft: () => null,
            headerRight: () => (
              <TouchableOpacity
                onPress={() => router.push("/perfil")}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                style={{ marginRight: 15 }}
              >
                <Ionicons
                  name="person-circle-outline"
                  size={28}
                  color="#fff"
                />
              </TouchableOpacity>
            ),
          }}
        />
      </Stack>
    </GestureHandlerRootView>
  );
}