import { Search } from './search'

export interface ElasticScript {
  id: string
  params: Record<string, any>
}

export function applyScriptScore(searchPayload: any, scriptScore: any) {
  if (!searchPayload.body.query) {
    // ES doesn't allow blank query object https://github.com/elastic/elasticsearch/issues/17540
    searchPayload.body.query = {
      script_score: {
        query: {
          match_all: {}
        },
        script: scriptScore
      }
    }
  } else {
    const actualQuery = searchPayload.body.query
    searchPayload.body.query = {
      script_score: {
        query: actualQuery,
        script: scriptScore
      }
    }
  }
}

export function applyScriptQuery(searchPayload: any, scriptQuery: any) {
  const scriptPayload = {
    bool: {
      filter: {
        script: {
          script: scriptQuery
        }
      }
    }
  }
  if (!searchPayload.body.query) {
    searchPayload.body.query = scriptPayload
  } else {
    if (!searchPayload.body.query.bool.must) {
      searchPayload.body.query.bool.must = []
    }

    searchPayload.body.query.bool.must.push(scriptPayload)
  }
}

export class Scripting {
  async saveScript(id: string, payload: string) {
    const _this = this as unknown as Search
    await _this.klass.client.putScript({
      id,
      body: {
        script: {
          lang: "painless",
          source: payload
        }
      }
    })
  }

  async findScript(id: string) {
    const _this = this as unknown as Search
    try {
      const response = await _this.klass.client.getScript({ id })
      return response.body.script
    } catch(e) {
      return null
    }
  }

  async deleteScript(id: string) {
    const _this = this as unknown as Search
    await _this.klass.client.deleteScript({ id })
  }

  scriptQuery(opts: ElasticScript): this {
    const _this = this as any
    _this._scriptQuery = opts
    return _this
  }

  scriptScore(opts: ElasticScript): this {
    const _this = this as any
    _this._scriptScore = opts
    return _this
  }
}