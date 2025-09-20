// Enhanced Web Scraping Utility for Coding Questions
// Note: This is a client-side implementation for demonstration
// In production, web scraping should be done server-side to avoid CORS issues

interface ScrapedQuestion {
  id: string;
  title: string;
  description: string;
  difficulty: string;
  category: string;
  examples: Array<{
    input: string;
    output: string;
    explanation?: string;
  }>;
  constraints?: string;
  hints?: string[];
  company?: string;
  tags?: string[];
}

export class WebScraper {
  private static readonly RATE_LIMIT = 2000; // 2 seconds between requests
  private static readonly MAX_RETRIES = 3;
  private static readonly USER_AGENTS = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
  ];

  // Enhanced mock scraping function for HackerRank-style questions
  static async scrapeHackerRankQuestions(count: number = 100): Promise<ScrapedQuestion[]> {
    console.log(`🕷️ Simulating scraping ${count} questions from HackerRank...`);
    
    const questions: ScrapedQuestion[] = [];
    const categories = [
      'Arrays', 'Strings', 'Dynamic Programming', 'Graphs', 'Trees', 'Sorting',
      'Hash Tables', 'Linked Lists', 'Binary Search', 'Greedy', 'Backtracking',
      'Math', 'Bit Manipulation', 'Two Pointers', 'Sliding Window', 'Stack',
      'Queue', 'Heap', 'Trie', 'Union Find'
    ];
    const difficulties = ['Easy', 'Medium', 'Hard'];
    const companies = ['Google', 'Facebook', 'Amazon', 'Microsoft', 'Apple', 'Netflix', 'Uber', 'LinkedIn'];
    
    for (let i = 1; i <= count; i++) {
      await this.delay(this.RATE_LIMIT / 20); // Simulate rate limiting
      
      const category = categories[i % categories.length];
      const difficulty = difficulties[i % difficulties.length];
      const company = companies[i % companies.length];
      
      questions.push({
        id: `hr_scraped_${i.toString().padStart(3, '0')}`,
        title: `${category} Challenge ${i}`,
        description: `This is a ${difficulty.toLowerCase()} level ${category.toLowerCase()} problem commonly asked in ${company} interviews.

Problem Statement:
Given an input array/string, solve the problem using optimal algorithms and data structures.

The problem tests your understanding of ${category.toLowerCase()} and requires efficient implementation with proper time and space complexity analysis.

Input Format:
- First line contains the size of input (n)
- Following lines contain the data elements
- All inputs are guaranteed to be valid

Output Format:
- Print the result as specified in the problem requirements
- Ensure proper formatting and edge case handling

Sample Input:
5
1 2 3 4 5

Sample Output:
Expected result based on problem logic

Explanation:
For the given input, the algorithm processes the data according to the problem requirements and returns the expected result.`,
        difficulty: difficulty.toLowerCase(),
        category,
        company,
        examples: [
          {
            input: '5\n1 2 3 4 5',
            output: 'result',
            explanation: `For the given input of size 5 with elements [1, 2, 3, 4, 5], the algorithm processes the data and returns the expected result based on the problem logic.`
          },
          {
            input: '3\n7 8 9',
            output: 'result2',
            explanation: `Another example with different input to demonstrate the algorithm's behavior.`
          }
        ],
        constraints: '1 ≤ n ≤ 10⁵, 1 ≤ arr[i] ≤ 10⁹, Time Limit: 2 seconds, Memory Limit: 256 MB',
        hints: [
          `Think about the optimal approach for ${category.toLowerCase()} problems`,
          'Consider edge cases and boundary conditions carefully',
          'Optimize for both time and space complexity',
          'Use appropriate data structures for efficient operations'
        ],
        tags: [category.toLowerCase(), difficulty.toLowerCase(), 'interview', company.toLowerCase()]
      });
    }
    
    console.log(`✅ Successfully scraped ${questions.length} questions from HackerRank`);
    return questions;
  }

  static async scrapeLeetCodeQuestions(count: number = 100): Promise<ScrapedQuestion[]> {
    console.log(`🕷️ Simulating scraping ${count} questions from LeetCode...`);
    
    const questions: ScrapedQuestion[] = [];
    const categories = [
      'Array', 'String', 'Linked List', 'Binary Tree', 'Hash Table', 'Two Pointers',
      'Binary Search', 'Sliding Window', 'Dynamic Programming', 'Greedy',
      'Graph', 'Backtracking', 'Stack', 'Queue', 'Heap', 'Trie'
    ];
    const difficulties = ['Easy', 'Medium', 'Hard'];
    const companies = ['Google', 'Facebook', 'Amazon', 'Microsoft', 'Apple', 'ByteDance', 'Tesla', 'Adobe'];
    
    for (let i = 1; i <= count; i++) {
      await this.delay(this.RATE_LIMIT / 20);
      
      const category = categories[i % categories.length];
      const difficulty = difficulties[i % difficulties.length];
      const company = companies[i % companies.length];
      
      questions.push({
        id: `lc_scraped_${i.toString().padStart(3, '0')}`,
        title: `${i}. ${category} Problem`,
        description: `Given a problem involving ${category.toLowerCase()}, implement an efficient solution that handles all edge cases.

This is a ${difficulty.toLowerCase()} level problem that tests your understanding of ${category.toLowerCase()} operations and algorithmic thinking.

Constraints:
• 1 ≤ n ≤ 10⁴
• All inputs are valid and within specified ranges
• Time complexity should be optimized
• Space complexity should be considered

Example 1:
Input: [1, 2, 3]
Output: Expected result
Explanation: Process the input according to problem requirements and return the expected output.

Example 2:
Input: [4, 5, 6]
Output: Expected result
Explanation: Another example demonstrating the algorithm with different input values.

Follow-up: Can you solve this problem with better time/space complexity?`,
        difficulty: difficulty.toLowerCase(),
        category,
        company,
        examples: [
          {
            input: '[1, 2, 3]',
            output: 'result1',
            explanation: 'First example explanation with detailed reasoning'
          },
          {
            input: '[4, 5, 6]',
            output: 'result2',
            explanation: 'Second example explanation with alternative approach'
          }
        ],
        constraints: '1 ≤ n ≤ 10⁴, Time Limit: 1 second, Memory Limit: 128 MB',
        hints: [
          'Consider the optimal data structure for this problem',
          'Think about the time complexity requirements',
          'Handle edge cases carefully (empty input, single element)',
          'Consider using built-in functions vs custom implementation'
        ],
        tags: [category.toLowerCase(), difficulty.toLowerCase(), 'leetcode', company.toLowerCase()]
      });
    }
    
    console.log(`✅ Successfully scraped ${questions.length} questions from LeetCode`);
    return questions;
  }

  static async scrapeCodeChefQuestions(count: number = 100): Promise<ScrapedQuestion[]> {
    console.log(`🕷️ Simulating scraping ${count} questions from CodeChef...`);
    
    const questions: ScrapedQuestion[] = [];
    const categories = [
      'Implementation', 'Math', 'Greedy', 'Dynamic Programming', 'Graph Theory',
      'Data Structures', 'Number Theory', 'Combinatorics', 'Geometry', 'String Algorithms'
    ];
    const difficulties = ['Beginner', 'Easy', 'Medium', 'Hard', 'Challenge'];
    
    for (let i = 1; i <= count; i++) {
      await this.delay(this.RATE_LIMIT / 15);
      
      const category = categories[i % categories.length];
      const difficulty = difficulties[i % difficulties.length];
      
      questions.push({
        id: `cc_scraped_${i.toString().padStart(3, '0')}`,
        title: `${category} Problem ${i}`,
        description: `This is a ${difficulty.toLowerCase()} level ${category.toLowerCase()} problem from CodeChef practice section.

Problem Description:
You are given a computational problem that requires implementing an efficient algorithm using ${category.toLowerCase()} concepts.

The problem involves processing input data and producing the correct output according to the specified requirements.

Input:
- First line contains T, the number of test cases
- For each test case, input format is specified
- All inputs are within the given constraints

Output:
- For each test case, output the result on a new line
- Follow the exact output format specified

Constraints:
- 1 ≤ T ≤ 100
- Problem-specific constraints apply
- Time limit: 1-2 seconds per test case

Sample Input:
2
5
1 2 3 4 5
3
7 8 9

Sample Output:
result1
result2

Explanation:
For each test case, the algorithm processes the input and produces the expected output based on the problem logic.`,
        difficulty: difficulty.toLowerCase(),
        category,
        examples: [
          {
            input: '2\n5\n1 2 3 4 5\n3\n7 8 9',
            output: 'result1\nresult2',
            explanation: 'Process each test case independently and output results'
          }
        ],
        constraints: '1 ≤ T ≤ 100, 1 ≤ n ≤ 10⁵, Time Limit: 2 seconds',
        hints: [
          'Read the problem statement carefully',
          'Handle multiple test cases efficiently',
          'Consider the time complexity for large inputs',
          'Use appropriate data structures'
        ],
        tags: [category.toLowerCase(), difficulty.toLowerCase(), 'codechef', 'competitive']
      });
    }
    
    console.log(`✅ Successfully scraped ${questions.length} questions from CodeChef`);
    return questions;
  }

  // Real web scraping implementation (for server-side use)
  static async realWebScraping(url: string, selectors: any): Promise<ScrapedQuestion[]> {
    // This would be implemented server-side using tools like:
    // - Puppeteer for headless browser automation
    // - Cheerio for HTML parsing
    // - Playwright for cross-browser testing
    
    const scrapingCode = `
    // Server-side implementation example:
    
    const puppeteer = require('puppeteer');
    const cheerio = require('cheerio');
    
    async function scrapeQuestions(url, selectors) {
      const browser = await puppeteer.launch({ 
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });
      const page = await browser.newPage();
      
      // Set user agent to avoid detection
      await page.setUserAgent('${this.USER_AGENTS[0]}');
      
      // Set viewport and other options
      await page.setViewport({ width: 1920, height: 1080 });
      
      try {
        await page.goto(url, { 
          waitUntil: 'networkidle2',
          timeout: 30000
        });
        
        // Wait for content to load
        await page.waitForSelector(selectors.title, { timeout: 10000 });
        
        const content = await page.content();
        const $ = cheerio.load(content);
        
        const questions = [];
        
        $(selectors.questionContainer).each((index, element) => {
          const title = $(element).find(selectors.title).text().trim();
          const description = $(element).find(selectors.description).text().trim();
          const difficulty = $(element).find(selectors.difficulty).text().trim();
          const category = $(element).find(selectors.category).text().trim();
          
          if (title && description) {
            questions.push({
              id: \`scraped_\${index + 1}\`,
              title,
              description,
              difficulty: difficulty.toLowerCase(),
              category: category || 'General',
              examples: [],
              constraints: '',
              hints: []
            });
          }
        });
        
        await browser.close();
        return questions;
      } catch (error) {
        await browser.close();
        throw error;
      }
    }
    `;
    
    console.log('Real web scraping would be implemented server-side:', scrapingCode);
    
    // For now, return empty array as this needs server-side implementation
    return [];
  }

  // Utility function to convert scraped questions to our format
  static convertToQuestionFormat(scrapedQuestions: ScrapedQuestion[]): any[] {
    return scrapedQuestions.map((q, index) => ({
      id: q.id,
      title: q.title,
      description: q.description,
      difficulty: q.difficulty as 'easy' | 'medium' | 'hard',
      category: q.category,
      company: q.company || 'Scraped',
      constraints: q.constraints,
      examples: q.examples,
      testCases: [
        {
          input: q.examples[0]?.input || 'sample_input',
          expectedOutput: q.examples[0]?.output || 'sample_output',
          isHidden: false
        },
        {
          input: 'test_input_2',
          expectedOutput: 'test_output_2',
          isHidden: true
        },
        {
          input: 'edge_case_input',
          expectedOutput: 'edge_case_output',
          isHidden: true
        },
        {
          input: 'large_input',
          expectedOutput: 'large_output',
          isHidden: true
        }
      ],
      starterCode: {
        javascript: `function solve(input) {
    // Your code here for: ${q.title}
    // Input format: ${q.examples[0]?.input || 'Check problem description'}
    
    return result;
}`,
        python: `def solve(input):
    # Your code here for: ${q.title}
    # Input format: ${q.examples[0]?.input || 'Check problem description'}
    
    return result`,
        java: `public class Solution {
    public String solve(String input) {
        // Your code here for: ${q.title}
        // Input format: ${q.examples[0]?.input || 'Check problem description'}
        
        return result;
    }
}`,
        cpp: `#include <iostream>
#include <string>
#include <vector>
#include <algorithm>
using namespace std;

class Solution {
public:
    string solve(string input) {
        // Your code here for: ${q.title}
        // Input format: ${q.examples[0]?.input || 'Check problem description'}
        
        return result;
    }
};`,
        c: `#include <stdio.h>
#include <string.h>
#include <stdlib.h>

char* solve(char* input) {
    // Your code here for: ${q.title}
    // Input format: ${q.examples[0]?.input || 'Check problem description'}
    
    return result;
}`
      },
      hints: q.hints || [
        'Read the problem statement carefully',
        'Consider the constraints and edge cases',
        'Think about the optimal algorithm and data structures',
        'Test with the provided examples first'
      ],
      timeLimit: 30,
      tags: q.tags || []
    }));
  }

  // Rate limiting utility
  private static delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Batch scraping with error handling and progress tracking
  static async batchScrape(sources: string[], questionsPerSource: number = 50): Promise<ScrapedQuestion[]> {
    const allQuestions: ScrapedQuestion[] = [];
    
    console.log(`🚀 Starting batch scraping from ${sources.length} sources...`);
    
    for (const [index, source] of sources.entries()) {
      try {
        console.log(`🔄 [${index + 1}/${sources.length}] Scraping from ${source}...`);
        
        let questions: ScrapedQuestion[] = [];
        
        if (source.includes('hackerrank')) {
          questions = await this.scrapeHackerRankQuestions(questionsPerSource);
        } else if (source.includes('leetcode')) {
          questions = await this.scrapeLeetCodeQuestions(questionsPerSource);
        } else if (source.includes('codechef')) {
          questions = await this.scrapeCodeChefQuestions(questionsPerSource);
        }
        
        allQuestions.push(...questions);
        
        console.log(`✅ [${index + 1}/${sources.length}] Scraped ${questions.length} questions`);
        
        // Rate limiting between sources
        if (index < sources.length - 1) {
          console.log(`⏳ Waiting ${this.RATE_LIMIT * 2}ms before next source...`);
          await this.delay(this.RATE_LIMIT * 2);
        }
        
      } catch (error) {
        console.error(`❌ [${index + 1}/${sources.length}] Failed to scrape from ${source}:`, error);
      }
    }
    
    console.log(`🎉 Batch scraping complete! Total questions: ${allQuestions.length}`);
    return allQuestions;
  }

  // Advanced scraping with pagination support
  static async scrapeWithPagination(
    baseUrl: string, 
    maxPages: number = 10,
    questionsPerPage: number = 20
  ): Promise<ScrapedQuestion[]> {
    const allQuestions: ScrapedQuestion[] = [];
    
    console.log(`📄 Scraping ${maxPages} pages from ${baseUrl}...`);
    
    for (let page = 1; page <= maxPages; page++) {
      try {
        console.log(`📖 Scraping page ${page}/${maxPages}...`);
        
        // Simulate pagination scraping
        const pageQuestions = await this.scrapeHackerRankQuestions(questionsPerPage);
        
        // Add page info to questions
        const questionsWithPageInfo = pageQuestions.map(q => ({
          ...q,
          id: `${q.id}_page${page}`,
          tags: [...(q.tags || []), `page-${page}`]
        }));
        
        allQuestions.push(...questionsWithPageInfo);
        
        console.log(`✅ Page ${page}: ${questionsWithPageInfo.length} questions scraped`);
        
        // Rate limiting between pages
        await this.delay(this.RATE_LIMIT);
        
      } catch (error) {
        console.error(`❌ Failed to scrape page ${page}:`, error);
      }
    }
    
    console.log(`🏁 Pagination scraping complete: ${allQuestions.length} total questions`);
    return allQuestions;
  }

  // Export scraped questions to JSON with enhanced formatting
  static exportToJSON(questions: ScrapedQuestion[], filename: string = 'scraped_questions.json'): void {
    const exportData = {
      metadata: {
        totalQuestions: questions.length,
        scrapedAt: new Date().toISOString(),
        categories: [...new Set(questions.map(q => q.category))],
        difficulties: [...new Set(questions.map(q => q.difficulty))],
        companies: [...new Set(questions.map(q => q.company).filter(Boolean))]
      },
      questions: questions
    };
    
    const jsonData = JSON.stringify(exportData, null, 2);
    const blob = new Blob([jsonData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    console.log(`📁 Exported ${questions.length} questions to ${filename}`);
  }

  // Import questions from JSON file with validation
  static async importFromJSON(file: File): Promise<ScrapedQuestion[]> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        try {
          const data = JSON.parse(e.target?.result as string);
          const questions = data.questions || data; // Handle both formats
          
          // Validate question format
          const validQuestions = questions.filter((q: any) => 
            q.id && q.title && q.description && q.difficulty
          );
          
          console.log(`📥 Imported ${validQuestions.length} valid questions from file`);
          resolve(validQuestions);
        } catch (error) {
          reject(new Error('Invalid JSON file format'));
        }
      };
      
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsText(file);
    });
  }

  // Generate comprehensive scraping report
  static generateScrapingReport(questions: ScrapedQuestion[]): any {
    const report = {
      summary: {
        totalQuestions: questions.length,
        avgDescriptionLength: questions.reduce((sum, q) => sum + q.description.length, 0) / questions.length,
        avgExamples: questions.reduce((sum, q) => sum + q.examples.length, 0) / questions.length
      },
      distribution: {
        byDifficulty: this.groupBy(questions, 'difficulty'),
        byCategory: this.groupBy(questions, 'category'),
        byCompany: this.groupBy(questions.filter(q => q.company), 'company')
      },
      quality: {
        questionsWithExamples: questions.filter(q => q.examples.length > 0).length,
        questionsWithHints: questions.filter(q => q.hints && q.hints.length > 0).length,
        questionsWithConstraints: questions.filter(q => q.constraints).length
      }
    };
    
    console.log('📊 Scraping Report Generated:', report);
    return report;
  }

  private static groupBy(array: any[], key: string): { [key: string]: number } {
    return array.reduce((result, item) => {
      const group = item[key] || 'Unknown';
      result[group] = (result[group] || 0) + 1;
      return result;
    }, {});
  }

  // Scraping scheduler for continuous updates
  static async schedulePeriodicScraping(
    sources: string[],
    intervalHours: number = 24,
    maxQuestions: number = 1000
  ): Promise<void> {
    console.log(`⏰ Scheduling periodic scraping every ${intervalHours} hours...`);
    
    const scrapeAndStore = async () => {
      try {
        console.log(`🔄 Starting scheduled scraping...`);
        const questions = await this.batchScrape(sources, Math.floor(maxQuestions / sources.length));
        
        // Store in localStorage with timestamp
        const scrapingData = {
          questions,
          lastUpdated: new Date().toISOString(),
          nextUpdate: new Date(Date.now() + intervalHours * 60 * 60 * 1000).toISOString()
        };
        
        localStorage.setItem('scrapedQuestions', JSON.stringify(scrapingData));
        console.log(`💾 Stored ${questions.length} questions in localStorage`);
        
      } catch (error) {
        console.error('❌ Scheduled scraping failed:', error);
      }
    };
    
    // Initial scraping
    await scrapeAndStore();
    
    // Schedule periodic updates
    setInterval(scrapeAndStore, intervalHours * 60 * 60 * 1000);
  }

  // Get cached questions from localStorage
  static getCachedQuestions(): { questions: ScrapedQuestion[]; lastUpdated: string } | null {
    try {
      const cached = localStorage.getItem('scrapedQuestions');
      if (cached) {
        const data = JSON.parse(cached);
        return {
          questions: data.questions || [],
          lastUpdated: data.lastUpdated || 'Unknown'
        };
      }
    } catch (error) {
      console.error('Failed to load cached questions:', error);
    }
    return null;
  }
}

// Configuration for different scraping sources
export const scrapingConfig = {
  hackerrank: {
    baseUrl: 'https://www.hackerrank.com/domains/algorithms',
    selectors: {
      questionContainer: '.challenge-list-item',
      title: '.challenge-name',
      description: '.challenge-body',
      difficulty: '.difficulty',
      category: '.track-name',
      examples: '.sample-test-case'
    },
    rateLimit: 2000,
    maxQuestions: 200,
    headers: {
      'User-Agent': WebScraper['USER_AGENTS'][0],
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.5',
      'Accept-Encoding': 'gzip, deflate',
      'Connection': 'keep-alive'
    }
  },
  leetcode: {
    baseUrl: 'https://leetcode.com/problemset/all/',
    selectors: {
      questionContainer: '[role="row"]',
      title: '[data-cy="question-title"]',
      description: '.content__u3I1',
      difficulty: '.difficulty__ES5S',
      category: '.tag',
      examples: '.example'
    },
    rateLimit: 3000,
    maxQuestions: 200,
    headers: {
      'User-Agent': WebScraper['USER_AGENTS'][1],
      'Accept': 'application/json, text/plain, */*',
      'Accept-Language': 'en-US,en;q=0.9',
      'Referer': 'https://leetcode.com/'
    }
  },
  codechef: {
    baseUrl: 'https://www.codechef.com/practice',
    selectors: {
      questionContainer: '.problem-widget',
      title: '.problem-title',
      description: '.problem-statement',
      difficulty: '.difficulty-rating',
      category: '.category-name',
      examples: '.sample-test'
    },
    rateLimit: 2500,
    maxQuestions: 300,
    headers: {
      'User-Agent': WebScraper['USER_AGENTS'][2],
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.5'
    }
  },
  codeforces: {
    baseUrl: 'https://codeforces.com/problemset',
    selectors: {
      questionContainer: '.problems tr',
      title: '.id a',
      description: '.problem-statement',
      difficulty: '.difficulty',
      category: '.tag',
      examples: '.sample-test'
    },
    rateLimit: 3000,
    maxQuestions: 150,
    headers: {
      'User-Agent': WebScraper['USER_AGENTS'][0],
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
    }
  }
};

// Python scraping script generator
export const generatePythonScraper = (targetSite: string): string => {
  return `
#!/usr/bin/env python3
"""
Enhanced Web Scraper for ${targetSite} Coding Questions
Scrapes 5000-100000 latest coding problems for interview preparation
"""

import requests
from bs4 import BeautifulSoup
import json
import time
import random
from urllib.parse import urljoin, urlparse
import logging
from typing import List, Dict, Optional

# Setup logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class CodingQuestionScraper:
    def __init__(self, base_url: str, rate_limit: float = 2.0):
        self.base_url = base_url
        self.rate_limit = rate_limit
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.5',
            'Accept-Encoding': 'gzip, deflate',
            'Connection': 'keep-alive'
        })
        
    def scrape_questions(self, max_questions: int = 5000) -> List[Dict]:
        """Scrape coding questions from ${targetSite}"""
        questions = []
        page = 1
        
        logger.info(f"Starting to scrape {max_questions} questions from ${targetSite}")
        
        while len(questions) < max_questions:
            try:
                # Construct page URL
                page_url = f"{self.base_url}?page={page}"
                logger.info(f"Scraping page {page}: {page_url}")
                
                # Make request with retry logic
                response = self.make_request(page_url)
                if not response:
                    break
                    
                soup = BeautifulSoup(response.content, 'html.parser')
                
                # Extract questions from page
                page_questions = self.extract_questions_from_page(soup, page)
                
                if not page_questions:
                    logger.warning(f"No questions found on page {page}, stopping...")
                    break
                    
                questions.extend(page_questions)
                logger.info(f"Page {page}: Found {len(page_questions)} questions (Total: {len(questions)})")
                
                page += 1
                
                # Rate limiting
                time.sleep(self.rate_limit + random.uniform(0, 1))
                
            except Exception as e:
                logger.error(f"Error scraping page {page}: {e}")
                break
                
        logger.info(f"Scraping complete! Total questions: {len(questions)}")
        return questions[:max_questions]
    
    def make_request(self, url: str, max_retries: int = 3) -> Optional[requests.Response]:
        """Make HTTP request with retry logic"""
        for attempt in range(max_retries):
            try:
                response = self.session.get(url, timeout=30)
                response.raise_for_status()
                return response
            except Exception as e:
                logger.warning(f"Request attempt {attempt + 1} failed: {e}")
                if attempt < max_retries - 1:
                    time.sleep(2 ** attempt)  # Exponential backoff
        return None
    
    def extract_questions_from_page(self, soup: BeautifulSoup, page: int) -> List[Dict]:
        """Extract questions from a single page"""
        questions = []
        
        # ${targetSite}-specific selectors
        question_containers = soup.find_all('div', class_='challenge-list-item')  # Adjust selector
        
        for i, container in enumerate(question_containers):
            try:
                question = self.extract_single_question(container, f"{page}_{i}")
                if question:
                    questions.append(question)
            except Exception as e:
                logger.warning(f"Failed to extract question {i} from page {page}: {e}")
                
        return questions
    
    def extract_single_question(self, container, question_id: str) -> Optional[Dict]:
        """Extract a single question from container"""
        try:
            # Extract basic info
            title_elem = container.find('a', class_='challenge-name')  # Adjust selector
            title = title_elem.text.strip() if title_elem else f"Problem {question_id}"
            
            difficulty_elem = container.find('span', class_='difficulty')  # Adjust selector
            difficulty = difficulty_elem.text.strip() if difficulty_elem else "Medium"
            
            # Get detailed problem page
            problem_url = urljoin(self.base_url, title_elem['href']) if title_elem else None
            description, examples, constraints = self.scrape_problem_details(problem_url)
            
            return {
                'id': f"${targetSite.lower()}_scraped_{question_id}",
                'title': title,
                'description': description,
                'difficulty': difficulty.lower(),
                'category': self.extract_category(container),
                'examples': examples,
                'constraints': constraints,
                'url': problem_url,
                'scraped_at': time.time()
            }
            
        except Exception as e:
            logger.error(f"Error extracting question {question_id}: {e}")
            return None
    
    def scrape_problem_details(self, url: str) -> tuple:
        """Scrape detailed problem description"""
        if not url:
            return "Problem description not available", [], "Constraints not specified"
            
        try:
            response = self.make_request(url)
            if not response:
                return "Failed to load problem details", [], "Constraints not available"
                
            soup = BeautifulSoup(response.content, 'html.parser')
            
            # Extract description
            desc_elem = soup.find('div', class_='challenge-body')  # Adjust selector
            description = desc_elem.get_text(strip=True) if desc_elem else "Description not available"
            
            # Extract examples
            examples = self.extract_examples(soup)
            
            # Extract constraints
            constraints_elem = soup.find('div', class_='constraints')  # Adjust selector
            constraints = constraints_elem.get_text(strip=True) if constraints_elem else "Constraints not specified"
            
            # Rate limiting for detail pages
            time.sleep(1)
            
            return description, examples, constraints
            
        except Exception as e:
            logger.error(f"Error scraping problem details from {url}: {e}")
            return "Error loading problem details", [], "Constraints not available"
    
    def extract_examples(self, soup: BeautifulSoup) -> List[Dict]:
        """Extract input/output examples"""
        examples = []
        
        try:
            example_containers = soup.find_all('div', class_='sample-test-case')  # Adjust selector
            
            for container in example_containers:
                input_elem = container.find('pre', class_='input')
                output_elem = container.find('pre', class_='output')
                
                if input_elem and output_elem:
                    examples.append({
                        'input': input_elem.get_text(strip=True),
                        'output': output_elem.get_text(strip=True),
                        'explanation': 'Example explanation'
                    })
                    
        except Exception as e:
            logger.warning(f"Error extracting examples: {e}")
            
        return examples
    
    def extract_category(self, container) -> str:
        """Extract problem category"""
        try:
            category_elem = container.find('span', class_='track-name')  # Adjust selector
            return category_elem.text.strip() if category_elem else "General"
        except:
            return "General"
    
    def save_to_json(self, questions: List[Dict], filename: str = "${targetSite.toLowerCase()}_questions.json"):
        """Save questions to JSON file"""
        output_data = {
            'metadata': {
                'source': '${targetSite}',
                'total_questions': len(questions),
                'scraped_at': time.time(),
                'scraper_version': '2.0'
            },
            'questions': questions
        }
        
        with open(filename, 'w', encoding='utf-8') as f:
            json.dump(output_data, f, indent=2, ensure_ascii=False)
            
        logger.info(f"Saved {len(questions)} questions to {filename}")

# Usage example
if __name__ == "__main__":
    scraper = CodingQuestionScraper("${scrapingConfig[targetSite.toLowerCase()]?.baseUrl || 'https://example.com'}")
    
    # Scrape questions
    questions = scraper.scrape_questions(max_questions=5000)
    
    # Save to file
    scraper.save_to_json(questions)
    
    print(f"✅ Successfully scraped {len(questions)} questions from ${targetSite}")
`;
};

export default WebScraper;