import React from 'react';
import axios from 'axios';

const TITLE = 'React GraphQL GitHub Client';

const axiosGitHubGraphQL = axios.create({
  baseURL: 'https://api.github.com/graphql',
  headers: {
    Authorization: `bearer ${process.env.REACT_APP_GITHUB_PERS_ACCESS_TOKEN}`,
  },
});

const GET_ISSUES_OF_REPOSITORY = `
  query ($organization: String!, $repository: String!, $cursor: String) {
    organization(login: $organization) {
      name
      url
      repository(name: $repository) {
        name
        url
        issues(first: 5, after: $cursor, states: [OPEN]) {
          edges {
            node {
              id
              title
              url
              reactions(last: 50) {
                edges {
                  node {
                    content
                  }
                }
              }
            }
          }
          totalCount
          pageInfo {
            endCursor
            hasNextPage
          }
        }
      }
    }
  }
`;


const getIssuesOfRepository = (path, cursor) => {
  const [orgName, repository] = path.split('/');
  const repo = repository ?? '';
  return axiosGitHubGraphQL.post('', {
    query: GET_ISSUES_OF_REPOSITORY,
    variables: { organization: orgName, repository: repo, cursor},
  });
};

function App() {
  const [path, setPath] = React.useState('apollographql/apollo-client');
  const [organization, setOrganization] = React.useState();
  const [errors, setErrors] = React.useState([]);

  const onFetchFromGitHub = React.useCallback((path, cursor) => {
    getIssuesOfRepository(path, cursor)
      .then(result => {
        console.log(result);
        if (result.data.errors) {
          setErrors(result.data.errors);
          return;
        }
        const incomingOrg = result.data.data.organization;
        setErrors(null);
        if (!organization) {
          setOrganization(incomingOrg);
          return;
        };
        let oldIssues = [];
        if (
          organization?.name === incomingOrg?.name
          && organization?.url === incomingOrg?.url
          && organization?.repository?.name === incomingOrg?.repository?.name
          && organization?.repository?.url === incomingOrg?.repository?.url
        ) {
          oldIssues = organization?.repository?.issues?.edges ?? [];
        }


        const newOrg = {
          ...incomingOrg,
          repository: !incomingOrg?.repository ? null : {
            ...incomingOrg.repository,
            issues: {
              ...incomingOrg.repository.issues,
              edges: [
                ...oldIssues,
                ...incomingOrg.repository.issues.edges,
              ],
            },
          },
        };
        setOrganization(newOrg);
      });
    }, [organization]);

  React.useEffect(()=> {
    console.log('UseEffect');
    onFetchFromGitHub(path);
    // This fetch should fire only on initial mount, so remove path and onFetchFromGitHub from
    // dependencies
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onChange = React.useCallback((event) => {
    setPath(event.target.value);
  }, []);

  const onSubmit = React.useCallback(event => {
    console.log('onSubmit');
    event.preventDefault();
    onFetchFromGitHub(path);
  }, [onFetchFromGitHub, path]);

  const onFetchMoreIssues = React.useCallback(() => {
    console.log('onFetchMore');
    const { endCursor } = organization?.repository?.issues?.pageInfo;
    onFetchFromGitHub(path, endCursor);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [organization]);

  return (
    <div>
      <h1>{TITLE}</h1>
      <form onSubmit={onSubmit}>
        <label htmlFor="url">
          Show open issues for https://github.com/
        </label>
        <input
          id="url"
          type="text"
          style={{ width: '300px' }}
          onChange={onChange}
          value={path}
        />
        <button type="submit">Search</button>
      </form>
      <hr />
      <Organization
        organization={organization}
        errors={errors}
        onFetchMoreIssues={onFetchMoreIssues}
      />
    </div>
  );
}

const Organization = ({ organization, errors, onFetchMoreIssues }) => {
  if (errors && errors.length > 0) {
    return (
      <>
        <p>
          <strong>Something went wrong:</strong>
        </p>
        <ul>
          {errors.map((err, idx) => <li key={idx}>{err.message}</li>)}
        </ul>
      </>
    );
  }
  return (
    <div>
      <p>
        <strong>Issues from Organization: </strong>
        <a href={organization?.url}>{organization?.name ?? 'Unknown organization'}</a>
      </p>
      {organization?.repository
        ? <Repository repository={organization.repository} onFetchMoreIssues={onFetchMoreIssues} />
        : 'Unknown Repository'}
    </div>
  );
};

const Repository = ({ repository, onFetchMoreIssues }) => {
  const issues = repository.issues.edges?.map(issue => {
    return (
      <li key={issue.node.id}>
        <a href={issue.node.url}>{issue.node.title}</a>
        <ReactionsList reactions={issue.node.reactions} />
      </li>
    );
  });

  return (
    <div>
      <p>
        <strong>In Repository: </strong>
        <a href={repository.url}>
          {repository.name}
        </a>
        {`  (Showing ${issues.length} issues out of ${repository.issues.totalCount})`}
      </p>
      {repository.issues.pageInfo.hasNextPage && (
        <button onClick={onFetchMoreIssues}>More</button>
      )}
      <hr />
      <ol>
        {issues.length > 0 ? issues : <li>No Issues</li>}
      </ol>
      <hr />
      {repository.issues.pageInfo.hasNextPage && (
        <button onClick={onFetchMoreIssues}>More</button>
      )}
    </div>
  );
};

const ReactionsList = ({reactions}) => {
  return (
    <ul>
      <li>{`${reactions.edges.length} reactions`}</li>
    </ul>
  );
};

export default App;
