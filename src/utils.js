import { parse } from 'dot-properties'; // Import dot-properties for parsing .properties files
import JSZip from 'jszip';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.NEXT_PUBLIC_OPENAI_API_KEY,
  dangerouslyAllowBrowser: true,
})

const zip = new JSZip()

export async function readAndParseEnglishFile(englishFile, type) {
  if (englishFile) {
    const reader = new FileReader()
    return new Promise((resolve, reject) => {
      reader.onload = () => {
        let parsedProperties
        let { result } = reader
        if (type == 'properties') {
          // Parse the English property file using dot-properties
          parsedProperties = parse(result)
        } else {
          parsedProperties = JSON.parse(result)
        }

        resolve(parsedProperties)
      }
      reader.onerror = () => {
        reject(new Error('Error reading the English property file.'))
      }
      reader.readAsText(englishFile)
    })
  }
  return ''
}

export async function translateWithChatGPT(text, targetLanguage) {
  const response = await openai.chat.completions.create({
    model: 'gpt-3.5-turbo-16k',
    messages: [
      {
        role: 'user',
        content: `Translate the following English text to ${targetLanguage}: ${text}`,
      },
    ],
    temperature: 1,
    max_tokens: 256,
    top_p: 1,
    frequency_penalty: 0,
    presence_penalty: 0,
  })

  return response.choices[0].message.content
}

export function generatePropertyFile(properties) {
  let fileContent = ''
  for (const key in properties) {
    const value = properties[key]
    fileContent += `${key}=${value}\n`
  }
  return fileContent
}

export function createZipFile(
  translatedProperties,
  type,
  originalFileName,
  namingPattern,
) {
  // Iterate through target languages
  for (const language in translatedProperties) {
    // Add each translated .property file to the .zip file
    const fileName = generateTranslatedFileName(
      originalFileName,
      language,
      namingPattern,
    )
    if (type == 'properties') {
      zip.file(fileName, generatePropertyFile(translatedProperties[language]))
    } else {
      zip.file(
        fileName,
        JSON.stringify(translatedProperties[language], null, 2),
      )
    }
  }

  // Generate the .zip file
  zip.generateAsync({ type: 'blob' }).then(function (blob) {
    // Create a download link for the .zip file
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'translated_files.zip'
    document.body.appendChild(a)
    a.click()
    window.URL.revokeObjectURL(url)
  })
}

export function generateTranslatedFileName(
  originalFileName,
  languageCode,
  namingPattern,
) {
  // Extract the base name and file extension
  const parts = originalFileName.split('.')
  const baseName = parts.slice(0, -1).join('.')
  const fileExtension = parts.slice(-1)[0]

  // Get the language name based on languageCode
  const language = supportedLanguages.find((lang) => lang.code === languageCode)

  // Replace placeholders in the naming pattern
  const replacedPattern = namingPattern
    .replace('{languageCode}', languageCode)
    .replace('{originalFileName}', baseName)
    .replace('{lang}', language.name.toLowerCase())
    .replace('{Lang}', language.name)

  // Combine the replaced pattern with the file extension
  const translatedFileName = `${replacedPattern.trim()}.${fileExtension}`

  return translatedFileName
}

// function to get the total number of values to translate in the English file
export function countKeysWithStrings(obj) {
  let count = 0

  // Iterate over the keys in the object
  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      // Check if the value associated with the key is a string
      if (typeof obj[key] === 'string') {
        count++ // Increment the count for each string value
      } else if (typeof obj[key] === 'object' && !Array.isArray(obj[key])) {
        // If the value is an object, recursively count its keys
        count += countKeysWithStrings(obj[key])
      }
    }
  }

  return count
}

// Define the supported languages
export const supportedLanguages = [
  { code: 'es', name: 'Spanish' },
  { code: 'it', name: 'Italian' },
  { code: 'de', name: 'German' },
  { code: 'pl', name: 'Polish' },
  { code: 'fr', name: 'French' },
  { code: 'ja', name: 'Japanese' },
  { code: 'ko', name: 'Korean' },
  { code: 'zh-cn', name: 'Simplified Chinese' },
  { code: 'zh-tw', name: 'Traditional Chinese' },
  { code: 'ru', name: 'Russian' },
  { code: 'pt', name: 'Portuguese' },
  { code: 'nl', name: 'Dutch' },
  { code: 'sv', name: 'Swedish' },
  { code: 'da', name: 'Danish' },
  { code: 'fi', name: 'Finnish' },
  { code: 'no', name: 'Norwegian' },
  { code: 'tr', name: 'Turkish' },
  { code: 'ar', name: 'Arabic' },
  { code: 'hi', name: 'Hindi' },
  { code: 'id', name: 'Indonesian' },
  // You can continue adding more languages as needed
]

export const languageCodeRegex = /{languageCode}/
export const langRegex = /{lang}/
export const LangRegex = /{Lang}/
export const originalFileNameRegex = /{originalFileName}/

export function validateNamingPattern(pattern) {
  // Check if the pattern contains at least one of the variables
  if (
    !(
      languageCodeRegex.test(pattern) ||
      langRegex.test(pattern) ||
      LangRegex.test(pattern)
    )
  ) {
    return {
      isValid: false,
      reason:
        'Pattern must contain at least one of {languageCode}, {lang}, or {Lang}.',
    }
  }

  // If {originalFileName} is present, ensure at least one of the other variables is also present
  if (originalFileNameRegex.test(pattern)) {
    if (
      !(
        languageCodeRegex.test(pattern) ||
        langRegex.test(pattern) ||
        LangRegex.test(pattern)
      )
    ) {
      return {
        isValid: false,
        reason:
          'If {originalFileName} is present, the pattern must also contain at least one of {languageCode}, {lang}, or {Lang}.',
      }
    }
  }

  // Define a regular expression to check if the pattern ends with specific characters
  const forbiddenEndingCharsRegex = /[.,\-?!"'(){\[\]:;<>]+$/

  // Check if the pattern ends with forbidden characters
  if (forbiddenEndingCharsRegex.test(pattern)) {
    return {
      isValid: false,
      reason:
        'Pattern cannot end with characters like . , - ? ! \' " ( ) { [ ] : ; < >',
    }
  }

  // The pattern is valid
  return { isValid: true }
}

export const MAX_DISPLAY_LANGUAGE_OPTIONS_COUNT = 4

export const TOTAL_KEYS_COUNT_WARNING = 500
export const TOTAL_KEYS_COUNT_LIMIT = 800

/************ FOR METRICS PURPOSES ************/

export function generateUniqueIdentifier() {
  // For simplicity, this example generates a random 10-character alphanumeric identifier
  const alphanumeric =
    'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let identifier = ''
  for (let i = 0; i < 10; i++) {
    identifier += alphanumeric.charAt(
      Math.floor(Math.random() * alphanumeric.length),
    )
  }
  return identifier
}

export const START_TRANSLATION = "START TRANSLATION"
export const TRANSLATION_SUCCESS = "TRANSLATION SUCCESS"
export const TRANSLATION_FAILURE = "TRANSLATION FAILURE"

/***********************************************/
