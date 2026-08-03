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

// Role Synergy Complementarity Mapping
const ROLE_SYNERGY_MAP = {
  'frontend': ['backend', 'ui-ux', 'fullstack', 'mobile-dev', 'developer'],
  'backend': ['frontend', 'devops', 'fullstack', 'data-scientist', 'developer'],
  'fullstack': ['frontend', 'backend', 'ui-ux', 'devops', 'ai-engineer', 'developer'],
  'ui-ux': ['frontend', 'fullstack', 'product-manager', 'developer'],
  'ai-engineer': ['data-scientist', 'backend', 'fullstack', 'developer'],
  'data-scientist': ['ai-engineer', 'backend', 'fullstack', 'developer'],
  'devops': ['backend', 'fullstack', 'ai-engineer', 'developer'],
  'mobile-dev': ['backend', 'ui-ux', 'fullstack', 'developer'],
  'product-manager': ['ui-ux', 'fullstack', 'frontend', 'developer'],
  'developer': ['frontend', 'backend', 'fullstack', 'ui-ux', 'ai-engineer']
};

// Comprehensive Multi-Factor Partner Matching Calculation
export const calculateMatchDetails = (user1, user2) => {
  let roleSynergyScore = 70;
  let skillScore = 0;
  let interestScore = 0;
  let availabilityScore = 50;
  let experienceScore = 50;
  const highlights = [];

  // 1. Role Synergy (25% weight)
  const r1 = (user1.role || 'developer').toLowerCase();
  const r2 = (user2.role || 'developer').toLowerCase();
  if (r1 === r2) {
    roleSynergyScore = 80;
    highlights.push(`Peer role match: Both ${user1.role || 'Developer'}`);
  } else if (ROLE_SYNERGY_MAP[r1]?.includes(r2) || ROLE_SYNERGY_MAP[r2]?.includes(r1)) {
    roleSynergyScore = 98;
    highlights.push(`High Role Synergy: ${user1.role || 'Developer'} & ${user2.role || 'Developer'}`);
  } else {
    roleSynergyScore = 75;
  }

  // 2. Skill Complementarity & Overlap (35% weight)
  const skills1 = (user1.skills || []).map(s => s.toLowerCase());
  const skills2 = (user2.skills || []).map(s => s.toLowerCase());

  if (skills1.length && skills2.length) {
    const commonSkills = skills1.filter(s => skills2.includes(s));
    const uniqueSkills2 = skills2.filter(s => !skills1.includes(s));

    const overlapRatio = commonSkills.length / Math.max(skills1.length, skills2.length);
    const complementaryBonus = uniqueSkills2.length > 0 ? 0.25 : 0;
    skillScore = Math.min(100, Math.round((overlapRatio * 0.6 + complementaryBonus + (commonSkills.length > 0 ? 0.35 : 0)) * 100));

    if (commonSkills.length > 0) {
      highlights.push(`Shared Tech: ${commonSkills.slice(0, 3).join(', ').toUpperCase()}`);
    }
    if (uniqueSkills2.length > 0) {
      highlights.push(`Complementary Skill: Adds ${uniqueSkills2.slice(0, 2).join(', ').toUpperCase()}`);
    }
  } else {
    skillScore = 55;
  }

  // 3. Interests Alignment (20% weight)
  const int1 = (user1.interests || []).map(i => i.toLowerCase());
  const int2 = (user2.interests || []).map(i => i.toLowerCase());
  if (int1.length && int2.length) {
    const commonInt = int1.filter(i => int2.includes(i));
    interestScore = Math.min(100, Math.round((commonInt.length / Math.max(int1.length, int2.length)) * 100));
    if (commonInt.length > 0) {
      highlights.push(`Shared Interests: ${commonInt.slice(0, 2).join(', ')}`);
    }
  } else {
    interestScore = 50;
  }

  // 4. Availability & Experience (20% weight)
  if (user1.availability && user2.availability) {
    if (user1.availability === user2.availability) {
      availabilityScore = 100;
      highlights.push(`Matching Availability: ${user1.availability}`);
    } else if (user1.availability === 'flexible' || user2.availability === 'flexible') {
      availabilityScore = 80;
    } else {
      availabilityScore = 40;
    }
  }

  if (user1.experience && user2.experience) {
    const levels = ['junior', 'mid', 'senior'];
    const diff = Math.abs(levels.indexOf(user1.experience) - levels.indexOf(user2.experience));
    if (diff === 1) {
      experienceScore = 95;
      highlights.push(`Great Mentorship / Peer pairing (${user1.experience} & ${user2.experience})`);
    } else if (diff === 0) {
      experienceScore = 85;
    } else {
      experienceScore = 60;
    }
  }

  // Overall Score Calculation
  const totalScore = Math.round(
    (roleSynergyScore * 0.25) +
    (skillScore * 0.35) +
    (interestScore * 0.20) +
    (((availabilityScore + experienceScore) / 2) * 0.20)
  );

  const finalScore = Math.min(99, Math.max(50, totalScore));

  return {
    score: finalScore,
    factors: {
      roleSynergy: roleSynergyScore,
      skillScore,
      interestScore,
      availabilityScore,
      experienceScore
    },
    highlights: highlights.slice(0, 4)
  };
};

// Calculate match score between two users
export const calculateMatchScore = (user1, user2) => {
  try {
    const details = calculateMatchDetails(user1, user2);
    return details.score;
  } catch (error) {
    console.error('Error calculating match score:', error);
    return 65;
  }
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
  calculateMatchDetails,
  findSimilarUsers,
};
