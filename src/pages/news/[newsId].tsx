import { gql } from "apollo-boost";
import CropCorner from "components/CropCorner";
import Dot from "components/Dot";
import EmphasizedLink from "components/EmphasizedLink";
import ProjectTile from "components/projects/ProjectTile";
import Section from "components/Section";
import SectionHeader from "components/SectionHeader";
import { PrismicParagraph } from "components/typography";
import { NextPage } from "next";
import Head from "next/head";
import { RichText } from "prismic-reactjs";
import React from "react";
import { Row, Col } from "react-bootstrap";
import client from "services/apollo/client";
import styled from "styled-components";
import { breakPoints } from "styles/mq";
import { theme } from "styles/theme";
import { px2rem } from "styles/utils";
import { formatDateToddMMMM } from "utils/date";
import Share from "components/Share";
import fetchAllUids from "services/prismic/fetchAllUids";

type NewsDetailsPageProps = {
    news: NewsNode;
    projects: ProjectNode[];
};

const NewsDetailsPage: NextPage<NewsDetailsPageProps> = ({ news, projects }) => {
    return (
        <div>
            <Head>
                <title>Fundacja K.I.D.S. - {news.title && RichText.asText(news.title)}</title>
            </Head>

            {news.main_image && (
                <ImageSection>
                    <Row>
                        <Col>
                            <CropCorner bottomRight>
                                <MainImage src={news.main_image.url} alt={news.main_image.alt ?? undefined} />
                            </CropCorner>
                        </Col>
                    </Row>
                </ImageSection>
            )}

            <Section thin>
                {news.title && <SectionHeader responsiveSize>{RichText.asText(news.title)}</SectionHeader>}

                <MetaContainer>
                    {news.author && (
                        <>
                            {news.author.thumbnail && <AuthorAvatar avatar={news.author.thumbnail.url} />}
                            {news.author.first_name && news.author.last_name && (
                                <span>
                                    {RichText.asText(news.author.first_name)} {RichText.asText(news.author.last_name)}
                                </span>
                            )}
                            <Dot />
                        </>
                    )}
                    {news.date && (
                        <>
                            <span>{formatDateToddMMMM(news.date)}</span>
                            <Dot />
                        </>
                    )}
                    <NewsType>{news.type || ""}</NewsType>
                </MetaContainer>
                {news.full_description && <PrismicParagraph text={news.full_description} />}
            </Section>

            <Section>
                <Share />
            </Section>

            <Section>
                <SectionHeader extras={<EmphasizedLink href="/projects">Zobacz wszystkie projekty</EmphasizedLink>}>
                    Trwające projekty
                </SectionHeader>
                <Row>
                    {projects.map((project, i) => (
                        <ProjectTile key={project._meta?.id ?? i} project={project} />
                    ))}
                </Row>
            </Section>
        </div>
    );
};

const ImageSection = styled.section`
    margin-bottom: ${px2rem(60)};
`;

const MainImage = styled.img`
    margin: 0 auto;
    width: 100%;
    max-height: ${px2rem(500)};
    object-fit: cover;
`;

const MetaContainer = styled.div`
    color: ${theme.palette.grayScale.gray500};
    display: flex;
    align-items: center;
    margin-bottom: ${px2rem(40)};
    flex-wrap: wrap;

    > * {
        margin: ${px2rem(4)} 0;
    }

    @media (min-width: ${breakPoints.xl}) {
        margin-bottom: ${px2rem(80)};
    }
`;

const AuthorAvatar = styled.div<{ avatar: string }>`
    border-radius: 50%;
    height: ${px2rem(32)};
    width: ${px2rem(32)};
    margin-right: ${px2rem(16)};
    background: url(${({ avatar }) => avatar}) no-repeat center center / cover;
`;

const NewsType = styled.div`
    color: ${theme.palette.brand.secondary500};
    font-weight: 600;
    line-height: 1.6;
    padding: 0 ${px2rem(8)};
    border: 2px solid ${theme.palette.grayScale.gray200};
`;

export const getStaticProps = async ({ params }) => {
    try {
        const newsId = params.newsId instanceof Array ? params.newsId[0] : params.newsId;

        const response = await client.query<{ news: NewsNode; projects: PrismicNodes<ProjectNode> }>({
            query: gql`
                query {
                    news(uid: "${newsId}", lang: "pl") {
                        _meta {
                            id
                            uid
                        }
                        title
                        type
                        date
                        main_image
                        full_description
                        author {
                            ... on People {
                                first_name
                                last_name
                                thumbnail
                            }
                        }
                    }

                    projects: allProjects(first: 3) {
                        edges {
                            node {
                                _meta {
                                    id
                                    uid
                                }
                                raised_money
                                project_goal
                                main_image
                                title
                                short_description
                            }
                        }
                    }
                }
            `,
        });

        if (!response.data.news) {
            return { notFound: true };
        }

        return {
            props: {
                news: response.data.news,
                projects: response.data.projects.edges.map(e => e.node),
            },
        };
    } catch (e) {
        console.error(e);
        throw new Error("Can't fetch news content");
    }
};

export const getStaticPaths = async () => {
    const uids = await fetchAllUids("allNewss", "meta_firstPublicationDate_DESC");

    return {
        paths: uids.map(uid => ({
            params: { newsId: uid },
        })),
        fallback: "blocking",
    };
};

export default NewsDetailsPage;
