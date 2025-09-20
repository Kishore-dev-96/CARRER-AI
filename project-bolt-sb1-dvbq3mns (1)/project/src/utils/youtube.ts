const YOUTUBE_API_KEY = import.meta.env.VITE_YOUTUBE_API_KEY;

interface YouTubeVideo {
  id: string;
  title: string;
  description: string;
  thumbnail: string;
  url: string;
}

export class YouTubeService {
  static async searchVideos(query: string, maxResults: number = 5): Promise<YouTubeVideo[]> {
    try {
      if (!YOUTUBE_API_KEY) {
        return this.getFallbackVideos(query);
      }

      const response = await fetch(
        `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(query)}&type=video&maxResults=${maxResults}&key=${YOUTUBE_API_KEY}`
      );

      if (!response.ok) {
        throw new Error('YouTube API request failed');
      }

      const data = await response.json();
      
      return data.items.map((item: any) => ({
        id: item.id.videoId,
        title: item.snippet.title,
        description: item.snippet.description,
        thumbnail: item.snippet.thumbnails.medium.url,
        url: `https://www.youtube.com/watch?v=${item.id.videoId}`
      }));
    } catch (error) {
      console.error('YouTube search error:', error);
      return this.getFallbackVideos(query);
    }
  }

  private static getFallbackVideos(query: string): YouTubeVideo[] {
    // Fallback videos for common topics
    const fallbackVideos: { [key: string]: YouTubeVideo[] } = {
      'communication skills': [
        {
          id: 'fallback1',
          title: 'Effective Communication Skills',
          description: 'Learn essential communication techniques',
          thumbnail: 'https://via.placeholder.com/320x180',
          url: 'https://youtube.com/watch?v=example1'
        }
      ],
      'coding interview': [
        {
          id: 'fallback2',
          title: 'Coding Interview Preparation',
          description: 'Master coding interviews with practice',
          thumbnail: 'https://via.placeholder.com/320x180',
          url: 'https://youtube.com/watch?v=example2'
        }
      ],
      'presentation skills': [
        {
          id: 'fallback3',
          title: 'Public Speaking and Presentation',
          description: 'Improve your presentation skills',
          thumbnail: 'https://via.placeholder.com/320x180',
          url: 'https://youtube.com/watch?v=example3'
        }
      ]
    };

    const lowerQuery = query.toLowerCase();
    for (const [key, videos] of Object.entries(fallbackVideos)) {
      if (lowerQuery.includes(key)) {
        return videos;
      }
    }

    return [{
      id: 'fallback-general',
      title: 'General Learning Resources',
      description: 'Educational content for skill improvement',
      thumbnail: 'https://via.placeholder.com/320x180',
      url: 'https://youtube.com/watch?v=general'
    }];
  }
}