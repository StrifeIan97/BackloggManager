import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import axios, { AxiosResponse } from 'axios';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Button, FlatList, Text, View } from 'react-native';
import 'react-native-url-polyfill/auto';

// ✅ Substitua pelas suas credenciais reais do Supabase
const SUPABASE_URL = 'https://YOUR-PROJECT-ID.supabase.co';
const SUPABASE_ANON_KEY = 'YOUR-ANON-KEY';

// Tipos para dados da API externa
interface ApiPost {
  userId: number;
  id: number;
  title: string;
  body: string;
}

// Tipos para a tabela do Supabase
type SupabasePost = {
  id: number;
  title: string;
  body: string;
  api_id: number;
};

// Tipagem global do banco compatível com Supabase v2 recente
type Database = {
  public: {
    Tables: {
      posts: {
        Row: SupabasePost;
        Insert: Omit<SupabasePost, 'id'>;
        Update: Partial<SupabasePost>;
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
  };
};

// Criar cliente Supabase tipado e configurado para React Native
const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

export default function App(): React.JSX.Element {
  const [data, setData] = useState<ApiPost[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const fetchData = async (): Promise<void> => {
      try {
        const response: AxiosResponse<ApiPost[]> = await axios.get(
          'https://jsonplaceholder.typicode.com/posts'
        );

        if (!Array.isArray(response.data)) {
          throw new Error('Resposta inesperada da API');
        }

        setData(response.data.slice(0, 10));
      } catch (error: unknown) {
        if (error instanceof Error) {
          Alert.alert('Erro na API', error.message);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const addToSupabase = async (item: ApiPost): Promise<void> => {
    try {
      const { data: existing, error: checkError } = await supabase
        .from('posts')
        .select('api_id')
        .eq('api_id', item.id)
        .limit(1);

      if (checkError) throw checkError;

      if (existing && existing.length > 0) {
        Alert.alert('Duplicado', `O item "${item.title}" já existe no Supabase.`);
        return;
      }

      const { data: insertedData, error } = await supabase
        .from('posts')
        .insert([
          {
            title: item.title,
            body: item.body,
            api_id: item.id,
          },
        ])
        .select();

      if (error) throw error;

      Alert.alert('Sucesso', `Item "${item.title}" adicionado ao Supabase!`);
      console.log('Inserido:', insertedData);
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : (err as { message?: string })?.message || 'Erro desconhecido';
      Alert.alert('Erro Supabase', message);
    }
  };

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, padding: 20 }}>
      <FlatList
        data={data}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => (
          <View
            style={{
              padding: 10,
              marginBottom: 10,
              backgroundColor: '#f0f0f0',
              borderRadius: 5,
            }}
          >
            <Text style={{ fontWeight: 'bold' }}>{item.title}</Text>
            <Text style={{ marginVertical: 5 }}>{item.body}</Text>
            <Button title="Adicionar ao Supabase" onPress={() => addToSupabase(item)} />
          </View>
        )}
      />
    </View>
  );
}