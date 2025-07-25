const axios = require('axios');
const { cmd } = require('../settings');
const { delay, formatDuration } = require('../lib/utils');

// Enhanced Movie Service Module
const MovieService = {
    /**
     * Fetch movie data from API
     * @param {string} movieName - Movie title to search
     * @param {number} retries - Number of retry attempts
     * @returns {Promise<object|null>} Movie data or null if not found
     */
    fetchMovieData: async (movieName, retries = 2) => {
        const endpoints = [
            `https://apis.davidcyriltech.my.id/imdb?query=${encodeURIComponent(movieName)}`,
            `https://movie-api.altech.my.id/imdb?query=${encodeURIComponent(movieName)}`,
            `https://api.popcat.xyz/imdb?q=${encodeURIComponent(movieName)}`
        ];

        for (let i = 0; i < endpoints.length; i++) {
            try {
                const response = await axios.get(endpoints[i], { 
                    timeout: 8000,
                    headers: { 'User-Agent': 'ZUKO-MD/1.0' }
                });
                
                if (response.data?.movie) {
                    return this.normalizeMovieData(response.data.movie);
                }
            } catch (error) {
                console.error(`Movie API attempt ${i+1} failed:`, error.message);
                if (i < endpoints.length - 1) await delay(1000);
            }
        }
        
        throw new Error('All movie API endpoints failed');
    },

    /**
     * Normalize movie data structure from different APIs
     * @param {object} movie - Raw movie data
     * @returns {object} Normalized movie data
     */
    normalizeMovieData: (movie) => {
        return {
            title: movie.title || movie.Title,
            year: movie.year || movie.Year,
            imdbRating: movie.imdbRating || movie.rating,
            ratings: Array.isArray(movie.ratings) ? movie.ratings : [],
            boxoffice: movie.boxoffice || movie.BoxOffice,
            released: movie.released || movie.Released,
            runtime: movie.runtime || movie.Runtime,
            genres: movie.genres || movie.Genre,
            plot: movie.plot || movie.Plot,
            director: movie.director || movie.Director,
            writer: movie.writer || movie.Writer,
            actors: movie.actors || movie.Actors,
            country: movie.country || movie.Country,
            languages: movie.languages || movie.Language,
            awards: movie.awards || movie.Awards,
            imdbUrl: movie.imdbUrl || `https://www.imdb.com/title/${movie.imdbID}`,
            poster: movie.poster || movie.Poster
        };
    }
};

// Enhanced Formatter Module
const MovieFormatter = {
    /**
     * Create a styled header
     * @param {string} text - Header text
     * @returns {string} Formatted header
     */
    formatHeader: (text) => {
        const line = '─'.repeat(text.length + 4);
        return `┌${line}┐\n│  ${text}  │\n└${line}┘`;
    },

    /**
     * Format movie information into a readable string
     * @param {object} movie - Movie data
     * @returns {string} Formatted movie info
     */
    formatMovieInfo: (movie) => {
        if (!movie) return '❌ No movie data available';

        const getRating = (source) => {
            const rating = movie.ratings?.find(r => 
                r.source?.includes(source) || r.Source?.includes(source)
            return rating?.value || rating?.Value || 'N/A';
        };

        return `
${MovieFormatter.formatHeader(`🎬 ${movie.title} (${movie.year})`)}

▢ *Rating*: ${movie.imdbRating || 'N/A'} ${'⭐'.repeat(Math.floor(parseFloat(movie.imdbRating) / 2 || 0)}
▢ *Rotten Tomatoes*: ${getRating('Rotten')}
▢ *Metacritic*: ${getRating('Metacritic')}
▢ *Box Office*: ${movie.boxoffice || 'N/A'}

▢ *Released*: ${movie.released ? new Date(movie.released).toLocaleDateString() : 'N/A'}
▢ *Runtime*: ${formatDuration(movie.runtime.replace(/[^0-9]/g, '') * 60000) || movie.runtime}
▢ *Genre*: ${movie.genres || 'N/A'}

▢ *Plot*: 
${movie.plot || 'No plot available'}

▢ *Director*: ${movie.director || 'N/A'}
▢ *Writer*: ${movie.writer || 'N/A'}
▢ *Actors*: ${movie.actors || 'N/A'}

▢ *Country*: ${movie.country || 'N/A'}
▢ *Language*: ${movie.languages || 'N/A'}
▢ *Awards*: ${movie.awards || 'None'}

[IMDb Link](${movie.imdbUrl || '#'})
`.trim();
    },

    /**
     * Prepare message options for sending
     * @param {object} movie - Movie data
     * @param {string} sender - User JID
     * @returns {Promise<object>} Message options
     */
    prepareMessageOptions: async (movie, sender) => {
        const defaultPoster = 'https://i.imgur.com/3QfZ5w0.jpg';
        const posterUrl = movie.poster && movie.poster !== 'N/A' ? movie.poster : defaultPoster;

        return {
            image: { url: posterUrl },
            caption: this.formatMovieInfo(movie),
            contextInfo: {
                mentionedJid: [sender],
                forwardingScore: 999,
                isForwarded: true,
                externalAdReply: {
                    title: movie.title || 'Movie Info',
                    body: `⭐ ${movie.imdbRating || 'N/A'} | ${movie.year || ''}`,
                    thumbnail: await this.getThumbnailBuffer(posterUrl),
                    mediaType: 1,
                    mediaUrl: movie.imdbUrl || '',
                    sourceUrl: movie.imdbUrl || '',
                    showAdAttribution: true
                }
            }
        };
    },

    /**
     * Get thumbnail buffer for external ad reply
     * @param {string} posterUrl - URL of movie poster
     * @returns {Promise<Buffer|null>} Image buffer
     */
    getThumbnailBuffer: async (posterUrl) => {
        try {
            const response = await axios.get(posterUrl, { 
                responseType: 'arraybuffer',
                timeout: 5000
            });
            return response.data;
        } catch {
            return null;
        }
    }
};

// Command Handler
const movieCommand = cmd({
    pattern: "movie",
    alias: ["film", "cinema"],
    desc: "Fetch detailed information about any movie",
    category: "entertainment",
    react: "🎬",
    filename: __filename,
    usage: "<movie title>"
},
async (conn, mek, m, { from, reply, sender, args }) => {
    try {
        const movieName = args.length > 0 ? args.join(' ') : 
                         m.quoted?.text || m.text.replace(/^[\.\#\$\!]?movie\s?/i, '').trim();
        
        if (!movieName) {
            const helpMsg = [
                MovieFormatter.formatHeader("🎬 MOVIE COMMAND"),
                "",
                "Search for movie information from IMDb",
                "",
                "*Usage:*",
                "• .movie <movie title>",
                "• .movie The Dark Knight",
                "",
                "*Examples:*",
                "• .movie Inception",
                "• .movie Titanic 1997",
                "• Reply to a message with .movie"
            ].join("\n");
            
            return await reply(helpMsg);
        }

        // Show searching indicator
        const searchMsg = await conn.sendMessage(from, { 
            text: `${MovieFormatter.formatHeader("🔍 SEARCHING")}\n\nSearching for *"${movieName}"*...` 
        }, { quoted: mek });

        try {
            // Fetch movie data with retries
            const movie = await MovieService.fetchMovieData(movieName);
            
            if (!movie) {
                await conn.sendMessage(from, { 
                    text: `${MovieFormatter.formatHeader("❌ NOT FOUND")}\n\nNo results found for *"${movieName}"*\n\nTry a different title or check spelling.` 
                }, { quoted: mek });
                return await conn.sendMessage(from, { delete: searchMsg.key });
            }

            // Prepare and send response
            const messageOptions = await MovieFormatter.prepareMessageOptions(movie, sender);
            await conn.sendMessage(from, messageOptions, { quoted: mek });
            
            // Delete searching message
            await delay(1000);
            await conn.sendMessage(from, { delete: searchMsg.key });

        } catch (error) {
            console.error('Movie command processing error:', error);
            await conn.sendMessage(from, { 
                text: `${MovieFormatter.formatHeader("⚠️ ERROR")}\n\nFailed to fetch movie details. Please try again later.` 
            }, { quoted: mek });
            await conn.sendMessage(from, { delete: searchMsg.key });
        }

    } catch (e) {
        console.error('Movie command error:', e);
        await reply(`${MovieFormatter.formatHeader("❌ ERROR")}\n\nAn unexpected error occurred. Please try again.`);
    }
});

module.exports = movieCommand;