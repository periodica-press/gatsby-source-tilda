import axios from 'axios';
import query from 'query-string';

const API = 'http://api.tildacdn.info/v1';

class TildaApi {
  constructor(publicKey, secret) {
    this.publicKey = publicKey;
    this.secret = secret;
  }

  apiUrl(method, params = {}) {
    const queryString = query.stringify(params);
    return `${API}/${method}?publickey=${this.publicKey}&secretkey=${this.secret}&${queryString}`;
  }

  fetchProjects() {
    return axios.get(this.apiUrl('getprojectslist'))
      .then((response) => {
        if (response && response.data && response.data.status === 'FOUND') {
          return response.data.result || [];
        }
        throw new Error(response);
      });
  }

  fetchProjectPages(projectId) {
    return axios.get(this.apiUrl('getpageslist', { projectid: projectId }))
      .then((response) => {
        if (response && response.data && response.data.status === 'FOUND') {
          return response.data.result || [];
        }
        throw new Error(response);
      })
      .then((items) => items.filter((page) => page.published !== ''));
  }

  fetchPage(pageId) {
    return axios.get(this.apiUrl('getpageexport', { pageid: pageId }))
      .then((response) => {
        if (response && response.data && response.data.status === 'FOUND') {
          return response.data.result;
        }
        throw new Error(response);
      });
  }
}

export default TildaApi;
