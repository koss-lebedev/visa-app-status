import { Context, APIGatewayEvent } from 'aws-lambda'
import { Either, left, right } from 'fp-ts/lib/Either'
import cheerio from 'cheerio'
import got from 'got'
import xlsx from 'xlsx'

type SuccessResponse = {
  statusCode: 200
  body: string
}

type ErrorResponse = {
  statusCode: 500
  errorMessage: string
}

type ApiResponse = ErrorResponse | SuccessResponse

type ProcessingError = string

const PAGE_URL = 'https://www.mvcr.cz/mvcren/article/status-of-your-application.aspx'

const parseParams = (params: { [name: string]: string }): Either<ProcessingError, string> => {
  return right('')
}

const downloadFile = async (): Promise<Either<ProcessingError, Buffer>> => {
  try {
    const page = await got(PAGE_URL)
    const pageHtml = page.body
    const xlsRelativeLoc = cheerio('a.dark', pageHtml).attr('href')
    const xlsLocation  = `https://www.mvcr.cz/mvcren/${xlsRelativeLoc}` 
  
    const fileResponse = await got(xlsLocation)
    const fileContent = new Buffer(fileResponse.body, 'binary') 
    return right(fileContent)
  } catch (error) {
    return left(error.message)
  }
}

const processXls = (data: Buffer): Either<ProcessingError, object> => {
  const xlsFile = xlsx.read(data)
  return right({ 
    pages: xlsFile.SheetNames.join(','),
  })
}

const handler =  async (event: APIGatewayEvent): Promise<ApiResponse> => {
  const params = event.queryStringParameters

  const file = await downloadFile()

  return file
    .map(processXls)
    .fold<ApiResponse>(
      errorMessage => ({ statusCode: 500, errorMessage }),
      json => ({ statusCode: 200, body: JSON.stringify(json.value) }),
    )
}

export { handler }
