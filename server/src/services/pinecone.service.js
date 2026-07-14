import { Pinecone } from '@pinecone-database/pinecone';

let pinecone;
let index;

// Initialize Pinecone
export const initPinecone = async () => {
  try {
    if (process.env.PINECONE_API_KEY && process.env.PINECONE_EMBEDDING === 'true') {
      pinecone = new Pinecone({
        apiKey: process.env.PINECONE_API_KEY,
      });

      // Get or create index
      const indexName = process.env.PINECONE_INDEX || 'project-pulse';
      
      try {
        index = pinecone.index(indexName);
        console.log('✅ Pinecone initialized successfully');
      } catch (error) {
        console.warn('⚠️ Pinecone index not found, AI matching will use fallback algorithm');
      }
    } else {
      console.log('ℹ️ Pinecone disabled, using fallback matching algorithm');
    }
  } catch (error) {
    console.error('❌ Error initializing Pinecone:', error.message);
    console.log('ℹ️ Continuing with fallback matching algorithm');
  }
};

// Generate embedding for user profile
export const generateUserEmbedding = async (user) => {
  try {
    // If Pinecone is not available, return empty array
    if (!pinecone || !index) {
      return [];
    }

    // Create a text representation of the user's profile
    const profileText = [
      user.role || '',
      ...(user.skills || []),
      ...(user.interests || []),
      user.experience || '',
      user.bio || '',
    ].filter(Boolean).join(' ');

    // In production, you would use an actual embedding model here
    // For now, we'll create a simple hash-based embedding
    const embedding = createSimpleEmbedding(profileText);

    // Store in Pinecone
    await index.upsert([
      {
        id: user.id,
        values: embedding,
        metadata: {
          userId: user.id,
          skills: user.skills || [],
          interests: user.interests || [],
          availability: user.availability || '',
        },
      },
    ]);

    return embedding;
  } catch (error) {
    console.error('Error generating user embedding:', error);
    return [];
  }
};

// Calculate match score between two users
export const calculateMatchScore = async (user1, user2) => {
  try {
    // Try vector similarity if embeddings are available
    if (user1.embedding?.length > 0 && user2.embedding?.length > 0) {
      const vectorScore = cosineSimilarity(user1.embedding, user2.embedding);
      return vectorScore * 100;
    }

    // Fallback to rule-based matching
    return calculateRuleBasedScore(user1, user2);
  } catch (error) {
    console.error('Error calculating match score:', error);
    return calculateRuleBasedScore(user1, user2);
  }
};

// Rule-based matching (fallback)
const calculateRuleBasedScore = (user1, user2) => {
  let score = 0;
  let maxScore = 0;

  // Skills matching (40% weight)
  maxScore += 40;
  if (user1.skills?.length && user2.skills?.length) {
    const commonSkills = user1.skills.filter(skill => 
      user2.skills.includes(skill)
    );
    score += (commonSkills.length / Math.max(user1.skills.length, user2.skills.length)) * 40;
  }

  // Interests matching (30% weight)
  maxScore += 30;
  if (user1.interests?.length && user2.interests?.length) {
    const commonInterests = user1.interests.filter(interest => 
      user2.interests.includes(interest)
    );
    score += (commonInterests.length / Math.max(user1.interests.length, user2.interests.length)) * 30;
  }

  // Availability matching (15% weight)
  maxScore += 15;
  if (user1.availability && user2.availability) {
    if (user1.availability === user2.availability) {
      score += 15;
    } else if (user1.availability === 'flexible' || user2.availability === 'flexible') {
      score += 10;
    }
  }

  // Experience level complementarity (15% weight)
  maxScore += 15;
  if (user1.experience && user2.experience) {
    const levels = ['junior', 'mid', 'senior'];
    const diff = Math.abs(
      levels.indexOf(user1.experience) - levels.indexOf(user2.experience)
    );
    // Prefer some experience difference for mentorship
    if (diff === 1) {
      score += 15;
    } else if (diff === 0) {
      score += 10;
    } else {
      score += 5;
    }
  }

  // Normalize score to 0-100
  return maxScore > 0 ? Math.min(100, (score / maxScore) * 100) : 50;
};

// Simple embedding generation (fallback)
const createSimpleEmbedding = (text, dimensions = 128) => {
  const embedding = new Array(dimensions).fill(0);
  const words = text.toLowerCase().split(/\s+/);
  
  words.forEach((word, index) => {
    const hash = simpleHash(word);
    for (let i = 0; i < dimensions; i++) {
      embedding[i] += Math.sin(hash + i) * Math.cos(hash * i);
    }
  });

  // Normalize
  const magnitude = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
  return embedding.map(val => val / (magnitude || 1));
};

// Simple hash function
const simpleHash = (str) => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return hash;
};

// Cosine similarity between two vectors
const cosineSimilarity = (vec1, vec2) => {
  if (vec1.length !== vec2.length) return 0;
  
  let dotProduct = 0;
  let mag1 = 0;
  let mag2 = 0;
  
  for (let i = 0; i < vec1.length; i++) {
    dotProduct += vec1[i] * vec2[i];
    mag1 += vec1[i] * vec1[i];
    mag2 += vec2[i] * vec2[i];
  }
  
  mag1 = Math.sqrt(mag1);
  mag2 = Math.sqrt(mag2);
  
  if (mag1 === 0 || mag2 === 0) return 0;
  
  return dotProduct / (mag1 * mag2);
};

// Query similar users from Pinecone
export const findSimilarUsers = async (userId, limit = 10) => {
  try {
    if (!index) {
      return [];
    }

    // Fetch user's embedding
    const userVector = await index.fetch([userId]);
    
    if (!userVector.records[userId]) {
      return [];
    }

    // Query similar vectors
    const queryResponse = await index.query({
      vector: userVector.records[userId].values,
      topK: limit + 1, // +1 to account for the user themselves
      includeMetadata: true,
    });

    // Filter out the user themselves
    return queryResponse.matches
      .filter(match => match.id !== userId)
      .slice(0, limit);
  } catch (error) {
    console.error('Error finding similar users:', error);
    return [];
  }
};

export default {
  initPinecone,
  generateUserEmbedding,
  calculateMatchScore,
  findSimilarUsers,
};
