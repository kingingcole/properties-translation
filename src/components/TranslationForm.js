'use client'

import {
  TOTAL_KEYS_COUNT_LIMIT,
  TOTAL_KEYS_COUNT_WARNING,
  countKeysWithStrings,
  createZipFile,
  readAndParseEnglishFile,
  supportedLanguages,
  translateWithChatGPT
} from '@/utils'
import { useEffect, useState } from 'react'
import ProgressBar from './ProgressBar'

const TranslationForm = () => {
  const [englishFile, setEnglishFile] = useState(null)
  const [targetLanguages, setTargetLanguages] = useState([])
  const [isTranslating, setIsTranslating] = useState(false)

  const [errorMessage, setErrorMessage] = useState('')
  const [progress, setProgress] = useState(0)

  const [fileType, setFileType] = useState('')
  const [totalKeysCount, setTotalKeysCount] = useState(0);

  const cleanUp = () => {
    setEnglishFile(null)
    setFileType('')
    setTargetLanguages([])
    setIsTranslating(false)
    setErrorMessage('')
  }

  const handleFileChange = async (e) => {
    const file = e.target.files[0]

    if (!file) {
      return
    }

    cleanUp()

    setEnglishFile(file)

    // Check if the selected file has the correct file extension
    if (file.name.endsWith('.properties')) {
      setFileType('properties')    
    } else if (file && file.name.endsWith('.json')) {
      setFileType('json')
    } else {
      // Show an error message or perform other handling for invalid file types
      setErrorMessage(
        'Unsupported file type. Please select a .properties or .json file.',
      )
    }
  }

  const handleLanguageChange = (e) => {
    const selectedLanguage = e.target.value
    if (targetLanguages.includes(selectedLanguage)) {
      // Remove the language if it's already selected
      setTargetLanguages(
        targetLanguages.filter((lang) => lang !== selectedLanguage),
      )
    } else {
      // Add the language if it's not already selected
      setTargetLanguages([...targetLanguages, selectedLanguage])
    }
  }

  const translateAndDownloadJSON = async () => {
    setIsTranslating(true)
    setErrorMessage('')
    setProgress(0)

    const englishContent = await readAndParseEnglishFile(englishFile, 'json')

    const translationPromises = targetLanguages.map(async (languageCode) => {
      const language = supportedLanguages.find(
        (lang) => lang.code == languageCode,
      )

      const translatedContent = await translateJson(
        englishContent,
        language.name,
      )
      return { languageCode, content: translatedContent }
    })

    Promise.all(translationPromises)
      .then((translations) => {
        const translatedFilesObject = {}
        translations.forEach((translation) => {
          translatedFilesObject[translation.languageCode] = translation.content
        })
        // setTranslations(translatedFilesObject);
        createZipFile(translatedFilesObject, 'json', englishFile.name)
        setIsTranslating(false)
      })
      .catch((error) => {
        setErrorMessage(error.message)
        setIsTranslating(false)
      })
  }

  async function translateJson(json, languageName) {
    // Check if the input is an object
    if (typeof json !== 'object') {
      // If not an object, return the value directly (non-translatable)
      return json
    }

    // Determine if it's an array or an object
    const isArray = Array.isArray(json)

    const translatedData = isArray ? [] : {}

    // Iterate through the keys or indices in the JSON object or array
    for (const key in json) {
      if (json.hasOwnProperty(key)) {
        const value = json[key]

        if (typeof value === 'object') { 
          // If the value is an object, recursively translate it
          translatedData[key] = await translateJson(value, languageName)
        } else {
          // Translate the value using your translation function
          translatedData[key] = await translateWithChatGPT(value, languageName)
          setProgress(progress => progress + (100/totalKeysCount))
        }
      }
    }

    return translatedData
  }

  const translateAndDownloadProperties = async () => {
    setIsTranslating(true)
    setErrorMessage('')
    setProgress(0)

    // Read and parse the English property file using dot-properties
    const englishContent = await readAndParseEnglishFile(
      englishFile,
      'properties',
    )

    const translationPromises = targetLanguages.map(async (languageCode) => {
      let translatedContent = {}
      const language = supportedLanguages.find(
        (lang) => lang.code == languageCode,
      )

      await Promise.all(
        Object.keys(englishContent).map(async (key) => {
          const translatedText = await translateWithChatGPT(
            englishContent[key],
            language.name,
          )
          translatedContent[key] = translatedText
          setProgress(progress => progress + (100/totalKeysCount))
        }),
      )
      return { languageCode, content: translatedContent }
    })

    Promise.all(translationPromises)
      .then((translations) => {
        const translatedFilesObject = {}
        translations.forEach((translation) => {
          translatedFilesObject[translation.languageCode] = translation.content
        })
        // setTranslations(translatedFilesObject);
        createZipFile(translatedFilesObject, 'properties', englishFile.name)
        setIsTranslating(false)
      })
      .catch((error) => {
        setErrorMessage(error.message)
        setIsTranslating(false)
      })
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!englishFile || !targetLanguages.length) {
      return
    }

    if (fileType == 'properties') {
      translateAndDownloadProperties()
    } else {
      translateAndDownloadJSON()
    }
  }

  useEffect(() => {
    const getTotalKeysCount = async () => {
      if (englishFile && targetLanguages.length && fileType) {
        const fileContent = await readAndParseEnglishFile(englishFile, fileType)
        setTotalKeysCount(countKeysWithStrings(fileContent) * targetLanguages.length)
      }
    }

    getTotalKeysCount();
    setProgress(0);
  }, [englishFile, fileType, targetLanguages.length])

  const getKeysCountLimitMessage = () => {
    
    if (totalKeysCount > TOTAL_KEYS_COUNT_LIMIT) {
      return (
        <small className="block text-sm font-medium text-red-700 mb-2">
          Error: Request too large. Consider breaking down the content into smaller parts.
        </small>
      )
    }
    if (totalKeysCount > TOTAL_KEYS_COUNT_WARNING) {
      return (
        <small className="block text-sm font-medium text-yellow-700 mb-2">
          Warning: Service may be slow and may fail. Consider breaking down the content into smaller parts.
        </small>
      )
    }

    return null;
  }

  const btnDisabled = !englishFile || !targetLanguages.length || isTranslating || totalKeysCount > TOTAL_KEYS_COUNT_LIMIT

  return (
    <div className="bg-white p-6 rounded-lg shadow-md w-96 mx-auto mt-8">
      <h1 className="text-2xl font-semibold mb-4 text-center">
        Property File Translation
      </h1>
      <form onSubmit={handleSubmit}>
        <div className="mb-4">
          <label
            htmlFor="file"
            className="block text-sm font-medium text-gray-700"
          >
            Upload English Property File in .properties or .json format
          </label>
          <input
            disabled={isTranslating}
            type="file"
            id="file"
            onChange={handleFileChange}
            accept=".properties, .json"
            className="mt-1 px-4 py-2 block w-full rounded-lg border focus:ring-indigo-500 focus:border-indigo-500 text-sm text-gray-600"
          />
        </div>
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700">
            Select Target Languages
          </label>
          {supportedLanguages.map((language) => (
            <div key={language.code} className="mt-2">
              <label className="inline-flex items-center">
                <input
                  disabled={isTranslating || !englishFile}
                  type="checkbox"
                  name="targetLanguages"
                  value={language.code}
                  checked={targetLanguages.includes(language.code)}
                  onChange={handleLanguageChange}
                  className="form-checkbox h-5 w-5 text-indigo-600"
                />
                <span className="ml-2 text-gray-700">{language.name}</span>
              </label>
            </div>
          ))}
        </div>
        {getKeysCountLimitMessage()}
        <button
          type="submit"
          className={`w-full bg-indigo-600 text-white py-2 px-4 rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 ${
            btnDisabled ? 'opacity-50 cursor-not-allowed' : ''
          }`}
          disabled={btnDisabled}
        >
          {isTranslating ? 'Translating...' : 'Translate and Download'}
        </button>
        {errorMessage.length > 0 && (
          <small className="block text-red-500 text-sm mt-1">
            {errorMessage}
          </small>
        )}
        {(isTranslating || progress > 0) && !errorMessage.length && (
          <ProgressBar progress={progress} />
        )}
      </form>
    </div>
  )
}

export default TranslationForm
