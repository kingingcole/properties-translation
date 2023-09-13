import { parse } from 'dot-properties'; // Import dot-properties for parsing .properties files
import JSZip from 'jszip';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.NEXT_PUBLIC_OPENAI_API_KEY,
  dangerouslyAllowBrowser: true,
})

const zip = new JSZip()

export async function readAndParseEnglishFile(englishFile) {
  if (englishFile) {
    const reader = new FileReader()
    return new Promise((resolve, reject) => {
      reader.onload = () => {
        // Parse the English property file using dot-properties
        const parsedProperties = parse(reader.result)
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
    model: 'gpt-3.5-turbo',
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

export function createZipFile(translatedProperties) {
  // Iterate through target languages
  for (const language in translatedProperties) {
    // Add each translated .property file to the .zip file
    zip.file(
      `translations_${language}.properties`,
      generatePropertyFile(translatedProperties[language]),
    )
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

// Define the supported languages
export const supportedLanguages = [
  { code: 'es', name: 'Spanish' },
  { code: 'it', name: 'Italian' },
  { code: 'de', name: 'German' },
  { code: 'pl', name: 'Polish' },
  // Add more languages here in the same format if needed
]
