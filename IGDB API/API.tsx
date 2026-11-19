import axios, { AxiosResponse } from 'axios';

// Twitch credentials
const CLIENT_ID = 'frofs860dn70bfpxrwr62xm8cf6vtf';
const ACCESS_TOKEN = '6k31f6px9bon4tj1swppat7xv8je8m';

export interface Platform {
  id?: number;
  name: string;
  abbreviation?: string;
}

export interface Game {
  id: number;
  name: string;
  first_release_date?: number; // Unix timestamp (opcional)
  rating?: number;             // Pode não existir
  cover?: { url: string };
  category?: number;
  platforms?: Platform[];
}

// Função para escapar aspas e caracteres especiais
function escapeQueryString(str: string): string {
  return str.replace(/"/g, '\\"').trim();
}

// Helper opcional para já deixar as plataformas prontas para exibir na UI
export function formatGamePlatforms(
  platforms?: Platform[],
  options: { useAbbreviation?: boolean; maxItems?: number } = {}
): string {
  if (!platforms || platforms.length === 0) {
    return 'Plataforma não informada';
  }

  const { useAbbreviation = false, maxItems } = options;
  const labels = platforms.map((p) =>
    useAbbreviation ? p.abbreviation || p.name : p.name
  );

  if (maxItems && labels.length > maxItems) {
    const remaining = labels.length - maxItems;
    return `${labels.slice(0, maxItems).join(', ')} +${remaining}`;
  }

  return labels.join(', ');
}

export async function searchGamesByName(
  name: string,
  limit: number = 30
): Promise<Game[]> {
  const safeName = escapeQueryString(name);

  try {
    const response: AxiosResponse<Game[]> = await axios({
      url: 'https://api.igdb.com/v4/games',
      method: 'POST',
      headers: {
        'Client-ID': CLIENT_ID,
        'Authorization': `Bearer ${ACCESS_TOKEN}`,
        'Accept': 'application/json',
        'Content-Type': 'text/plain',
      },
      data: `
        search "${safeName}";
        fields name, cover.url, rating, first_release_date, category, platforms.name, platforms.abbreviation;
        limit ${limit};
      `,
    });

    if (!response.data || !Array.isArray(response.data)) {
      return [];
    }

    // Filtro para remover DLCs, expansões, trilhas sonoras e extras sem barrar palavras como "lost"
    const apenasJogosReais = response.data.filter((game) => {
      if (game.category !== undefined && game.category !== 0) {
        return false;
      }

      const nomeLower = game.name.toLowerCase();

      const termosProibidos = [
        "dlc",
        "expansion",
        "add-on",
        "addon",
        "soundtrack",
        "season pass",
      ];

      const contemTermoProibido = termosProibidos.some((termo) =>
        nomeLower.includes(termo)
      );

       //Filtra "ost" apenas como palavra isolada (ex: "Game OST"), nunca dentro de "lost"
      const temOstIsolado = /\bost\b/i.test(game.name);

      return !contemTermoProibido && !temOstIsolado;
    });

    // Ajustar URL da capa para HTTPS e tamanho maior (t_cover_big)
    return apenasJogosReais.map((game) => {
      let coverUrl = game.cover?.url;
      if (coverUrl) {
        if (coverUrl.startsWith('//')) {
          coverUrl = `https:${coverUrl}`;
        }
        coverUrl = coverUrl.replace('t_thumb', 't_cover_big');
      }

      return {
        ...game,
        cover: coverUrl ? { url: coverUrl } : undefined,
      };
    });
  } catch (error: any) {
    if (error.response) {
      console.error('IGDB API Error:', error.response.status, error.response.data);
    } else {
      console.error('Request Error:', error.message);
    }
    throw error;
  }
}