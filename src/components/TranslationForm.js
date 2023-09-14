'use client'

import {
  MAX_DISPLAY_LANGUAGE_OPTIONS_COUNT,
  TOTAL_KEYS_COUNT_LIMIT,
  TOTAL_KEYS_COUNT_WARNING,
  countKeysWithStrings,
  createZipFile,
  generateTranslatedFileName,
  readAndParseEnglishFile,
  supportedLanguages,
  translateWithChatGPT,
  validateNamingPattern,
} from '@/utils'
import { useEffect, useState } from 'react'
import { Tooltip as ReactTooltip } from 'react-tooltip'

import AdvancedOptionsButton from './AdvancedOptionsButton'
import ProgressBar from './ProgressBar'

const TranslationForm = () => {
  const [englishFile, setEnglishFile] = useState(null)
  const [targetLanguages, setTargetLanguages] = useState([])
  const [isTranslating, setIsTranslating] = useState(false)

  const [errorMessage, setErrorMessage] = useState('')
  const [progress, setProgress] = useState(0)

  const [fileType, setFileType] = useState('')
  const [totalKeysCount, setTotalKeysCount] = useState(0)
  const [showAllLanguages, setShowAllLanguages] = useState(false)

  const [isAdvancedOptionsVisible, setAdvancedOptionsVisible] = useState(false)
  const [namingPattern, setNamingPattern] = useState(
    '{originalFileName}_{languageCode}',
  )

  const cleanUp = () => {
    setEnglishFile(null)
    setFileType('')
    setTargetLanguages([])
    setIsTranslating(false)
    setErrorMessage('')
  }

  const toggleShowAllLanguages = () => {
    setShowAllLanguages(!showAllLanguages)
  }

  const displayedLanguages = showAllLanguages
    ? supportedLanguages
    : supportedLanguages.slice(0, MAX_DISPLAY_LANGUAGE_OPTIONS_COUNT)

  const handleFileChange = async (e) => {
    const file = e.target.files[0]

    if (!file) {
      return
    }

    cleanUp()

    setEnglishFile(file)

    if (file.name.endsWith('.properties')) {
      setFileType('properties')
    } else if (file && file.name.endsWith('.json')) {
      setFileType('json')
    } else {
      setErrorMessage(
        'Unsupported file type. Please select a .properties or .json file.',
      )
    }
  }

  const handleLanguageChange = (e) => {
    const selectedLanguage = e.target.value
    if (targetLanguages.includes(selectedLanguage)) {
      setTargetLanguages(
        targetLanguages.filter((lang) => lang !== selectedLanguage),
      )
    } else {
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
        (lang) => lang.code === languageCode,
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
        createZipFile(
          translatedFilesObject,
          'json',
          englishFile.name,
          namingPattern,
        )
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
          translatedData[key] = await translateWithChatGPT(value, languageName)
          setProgress((progress) => progress + 100 / totalKeysCount)
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
        (lang) => lang.code === languageCode,
      )

      await Promise.all(
        Object.keys(englishContent).map(async (key) => {
          const translatedText = await translateWithChatGPT(
            englishContent[key],
            language.name,
          )
          translatedContent[key] = translatedText
          setProgress((progress) => progress + 100 / totalKeysCount)
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
        createZipFile(
          translatedFilesObject,
          'properties',
          englishFile.name,
          namingPattern,
        )
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

    if (fileType === 'properties') {
      translateAndDownloadProperties()
    } else {
      translateAndDownloadJSON()
    }
  }

  const toggleAdvancedOptions = () => {
    setAdvancedOptionsVisible(!isAdvancedOptionsVisible)
  }

  useEffect(() => {
    const getTotalKeysCount = async () => {
      if (englishFile && targetLanguages.length && fileType) {
        const fileContent = await readAndParseEnglishFile(englishFile, fileType)
        setTotalKeysCount(
          countKeysWithStrings(fileContent) * targetLanguages.length,
        )
      }
    }

    getTotalKeysCount()
    setProgress(0)
  }, [englishFile, fileType, targetLanguages.length])

  const getKeysCountLimitMessage = () => {
    if (totalKeysCount > TOTAL_KEYS_COUNT_LIMIT) {
      return (
        <small className="block text-sm font-medium text-red-700 mb-2">
          Error: Request too large. Consider breaking down the content into
          smaller parts.
        </small>
      )
    }
    if (totalKeysCount > TOTAL_KEYS_COUNT_WARNING) {
      return (
        <small className="block text-sm font-medium text-yellow-700 mb-2">
          Warning: Service may be slow and may fail. Consider breaking down the
          content into smaller parts.
        </small>
      )
    }

    return null
  }

  const { isValid: isValidNamingPattern, reason = '' } = validateNamingPattern(
    namingPattern.trim(),
  )
  const getSampleValidFileName = () => {
    if (isValidNamingPattern) {
      const sampleLanguageCode =
        targetLanguages[0] || supportedLanguages[0].code
      return `For e.g ${generateTranslatedFileName(
        englishFile?.name || 'sample.json',
        sampleLanguageCode,
        namingPattern,
      )}`
    }

    return ''
  }

  const btnDisabled =
    !englishFile ||
    !targetLanguages.length ||
    isTranslating ||
    totalKeysCount > TOTAL_KEYS_COUNT_LIMIT ||
    !isValidNamingPattern

  return (
    <div className="bg-white p-6 rounded-lg shadow-md w-full max-w-screen-sm mx-auto my-8">
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
          {displayedLanguages.map((language) => (
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
          {supportedLanguages.length > MAX_DISPLAY_LANGUAGE_OPTIONS_COUNT && (
            <button
              type="button"
              onClick={toggleShowAllLanguages}
              className="text-sm text-indigo-500 hover:text-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 mt-2"
            >
              {showAllLanguages ? 'Show Less' : 'Show More'}
            </button>
          )}
        </div>
        <AdvancedOptionsButton
          isVisible={isAdvancedOptionsVisible}
          toggleAdvancedOptions={toggleAdvancedOptions}
        />

        {isAdvancedOptionsVisible && (
          <div className="mb-4">
            <label className="text-sm font-medium text-gray-700 flex">
              <span>Naming Pattern for New Translated Files</span>
              <span
                className="ml-2 text-gray-700"
                data-tip="Naming Pattern Help"
                data-tooltip-id="naming-pattern-tooltip"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5 text-gray-700 cursor-pointer"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <circle cx="12" cy="12" r="10" />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M12 16v-4M12 8h.01"
                  />
                </svg>
              </span>
            </label>
            <div className="flex items-center mt-2">
              <input
                type="text"
                className="mt-1 px-4 py-2 w-full rounded-lg border focus:ring-indigo-500 focus:border-indigo-500 text-sm text-gray-600"
                placeholder="Enter naming pattern"
                value={namingPattern}
                onChange={(e) => setNamingPattern(e.target.value)}
              />
              <input
                type="text"
                className="mt-1 ml-2 px-4 py-2 rounded-lg text-sm text-gray-600 bg-gray-100 w-28 cursor-not-allowed"
                value={fileType && `.${fileType}`}
                disabled
              />
            </div>
            {!isValidNamingPattern && (
              <small className="text-red-500">{reason}</small>
            )}
            <small>{getSampleValidFileName()}</small>
          </div>
        )}
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
      {/* Tooltip for naming pattern help */}
      <ReactTooltip id="naming-pattern-tooltip">
        <div style={{ maxWidth: '450px' }}>
          <div></div>
          <ul>
            <li className="my-2">
              <code>{'{originalFileName}'}</code>: File name of the submitted
              English file
            </li>
            <li className="my-2">
              <code>{'{languageCode}'}</code>: Language code of the newly
              translated file (e.g., 'es', 'pl')
            </li>
            <li className="my-2">
              <code>{'{lang}'}</code>: Full lowercase language text of the newly
              translated file (e.g., 'spanish', 'polish')
            </li>
            <li className="my-2">
              <code>{'{Lang}'}</code>: Full capitalized language text of the
              newly translated file (e.g., 'Spanish', 'French')
            </li>
          </ul>
        </div>
      </ReactTooltip>
    </div>
  )
}

export default TranslationForm
