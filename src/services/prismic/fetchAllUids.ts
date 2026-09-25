import { gql } from "apollo-boost";
import client from "services/apollo/client";

type UidPage = {
    edges: {
        node: {
            _meta: {
                uid: string;
            };
        };
    }[];
    pageInfo: {
        hasNextPage: boolean;
        endCursor: string | null;
    };
};

// Prismic's GraphQL API returns 20 documents by default and never more than 100
// per page, so every collection has to be walked through with a cursor.
const PAGE_SIZE = 100;

const fetchAllUids = async (collection: string, sortBy?: string): Promise<string[]> => {
    const uids: string[] = [];
    let after: string | null = null;

    do {
        const args = [
            `first: ${PAGE_SIZE}`,
            after ? `after: "${after}"` : null,
            sortBy ? `sortBy: ${sortBy}` : null,
        ]
            .filter(Boolean)
            .join(", ");

        const response = await client.query<Record<string, UidPage>>({
            query: gql`
                query {
                    ${collection}(${args}) {
                        edges {
                            node {
                                _meta {
                                    uid
                                }
                            }
                        }
                        pageInfo {
                            hasNextPage
                            endCursor
                        }
                    }
                }
            `,
            fetchPolicy: "no-cache",
        });

        const page = response.data[collection];

        uids.push(...page.edges.map(e => e.node._meta.uid));

        after = page.pageInfo.hasNextPage ? page.pageInfo.endCursor : null;
    } while (after);

    return uids;
};

export default fetchAllUids;
