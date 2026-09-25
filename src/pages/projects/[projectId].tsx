import { gql } from "apollo-boost";
import CompanyTile from "components/CompanyTile";
import Person from "components/Person";
import LargeProject from "components/projects/LargeProject";
import { ProjectSchedule } from "components/projects/projectSchedule";
import { ProjectSpendings } from "components/projects/ProjectSpendings";
import Section from "components/Section";
import SectionHeader from "components/SectionHeader";
import Tiles from "components/Tiles";
import { PrismicParagraph } from "components/typography";
import { NextPage, GetStaticProps } from "next";
import Head from "next/head";
import { RichText } from "prismic-reactjs";
import React, { useMemo } from "react";
import Col from "react-bootstrap/Col";
import Row from "react-bootstrap/Row";
import client from "services/apollo/client";
import styled from "styled-components";
import { px2rem } from "styles/utils";
import Share from "components/Share";
import fetchDonations, { TPayProjectDonations } from "services/tpay";
import fetchAllUids from "services/prismic/fetchAllUids";

type ProjectDetailsPageProps = {
    project: ProjectNode;
    donations: TPayProjectDonations | null;
};

const ProjectDetailsPage: NextPage<ProjectDetailsPageProps> = ({ project, donations }) => {
    const hasSchedule = !!(project.schedule_details?.length || project.show_raised_funds || project.stats?.length);

    const hasSpendings = !!(project.planned_spendings_description || project.planned_spendings?.length);

    const hasLeaders = !!(project.leaders?.length || project.projects_leaders_description);

    const hasTeam = !!project.team?.length;

    const hasPartners = !!project.partners?.length;

    const stats = useMemo(() => {
        const statistics: ProjectStatistic[] = [];
        let raisedMoney: number | undefined;
        let donationsCount: number | undefined;

        if (project.show_raised_funds && donations) {
            raisedMoney = (donations.sum || 0) + (project.raised_money || 0);
            donationsCount = (donations.donations || 0) + (project.donations_count || 0);
        }

        if (raisedMoney !== undefined) {
            statistics.push({
                stat_title: project.raised_money_title,
                stat_value: raisedMoney,
                is_money: true,
            });
        }

        if (donationsCount !== undefined) {
            statistics.push({
                stat_title: project.donations_count_title,
                stat_value: donationsCount,
                is_money: true,
            });
        }

        statistics.push(...(project?.stats || []));

        return statistics;
    }, []);

    return (
        <div>
            <Head>
                <title>Fundacja K.I.D.S. - {project.title && RichText.asText(project.title)}</title>
            </Head>

            <Section>
                <LargeProject project={project} hideProgressBar />
            </Section>

            {hasPartners && (
                <Section>
                    <SectionHeader>{project.status === "Sukces" ? "Bez nich by się nie udało" : "Ten projekt wspierają"}</SectionHeader>

                    <Tiles>
                        {project.partners?.map((company, i) =>
                            company.partner ? <CompanyTile company={company.partner} key={i} /> : null,
                        )}
                    </Tiles>
                </Section>
            )}

            {hasSchedule && (
                <Section>
                    <ProjectSchedule
                        schedule={project.schedule_details}
                        projectStats={stats}
                    />
                </Section>
            )}
            {project.main_description && (
                <Section>
                    <Row className="justify-content-md-center">
                        <Col md="9">
                            <SectionHeader>Opis projektu</SectionHeader>
                            <PrismicParagraph text={project.main_description} />
                        </Col>
                    </Row>
                </Section>
            )}
            {hasSpendings && (
                <Section>
                    <ProjectSpendings
                        description={project.planned_spendings_description}
                        spendings={project.planned_spendings}
                    />
                </Section>
            )}
            {hasLeaders && (
                <Section>
                    <Row className="justify-content-md-center">
                        <Col md="9">
                            <SectionHeader>Liderzy projektu</SectionHeader>

                            <MembersContainer>
                                <Row>
                                    {project.leaders &&
                                    project.leaders.map((l, i) =>
                                        l.leader ? (
                                            <Col md="4" key={i}>
                                                <Person data={l.leader} />
                                            </Col>
                                        ) : null,
                                    )}
                                </Row>
                            </MembersContainer>

                            {project.projects_leaders_description && (
                                <PrismicParagraph text={project.projects_leaders_description} />
                            )}
                        </Col>
                    </Row>
                </Section>
            )}
            {hasTeam && (
                <Section>
                    <Row className="justify-content-md-center">
                        <Col md="9">
                            <SectionHeader>Zespół projektowy</SectionHeader>

                            {project.team_description && (
                                <PrismicParagraph text={project.team_description} />
                            )}

                            <MembersContainer>
                                {project.team?.map((t, i) =>
                                    t.team_member ? (
                                        <Person key={i} compact data={t.team_member} />
                                    ) : null,
                                )}
                            </MembersContainer>
                        </Col>
                    </Row>
                </Section>
            )}
            <Section>
                <Share />
            </Section>
        </div>
    );
};

const MembersContainer = styled.div`
    padding-top: ${px2rem(20)};
`;

export const getStaticProps: GetStaticProps<ProjectDetailsPageProps> = async ({ params }) => {
    try {
        const projectId = params?.projectId instanceof Array ? params?.projectId[0] : params?.projectId;

        const response = await client.query<{ project: ProjectNode, donations?: TPayProjectDonations }>({
            query: gql`
                fragment person on People {
                    degree
                    first_name
                    last_name
                    description
                    thumbnail
                }

                query {
                    project(uid: "${projectId}", lang: "pl") {
                        _meta {
                            id
                            uid
                        }
                        schedule_details {
                            date
                            target
                            completion_status
                        }
                        status
                        raised_money
                        donations_count
                        raised_money_title
                        donations_count_title
                        show_raised_funds
                        stats {
                            stat_title
                            stat_value
                            is_money
                        }
                        main_image
                        partners {
                            partner {
                                ... on Company {
                                    name
                                    logo
                                    url {
                                        _linkType
                                        ... on _ExternalLink {
                                            url
                                        }
                                    }
                                }
                            }
                        }
                        title
                        short_description
                        main_description
                        planned_spendings_description
                        planned_spendings {
                            name
                            value
                        }
                        leaders {
                            leader {
                                ...person
                            }
                        }
                        team {
                            team_member {
                                ...person
                            }
                        }
                        projects_leaders_description
                        team_description
                    }
                }
            `,
        });

        const project = response.data.project;

        if (!project) {
            return { notFound: true };
        }

        const projectMetaId = project?._meta?.id;
        let donations: TPayProjectDonations | null = null;

        // if (projectMetaId) {
        //     const donationsResponse = await fetchDonations();
        //     donations = donationsResponse[projectMetaId] || {};
        // }

        donations = {
            donations: 12,
            sum: 5562,
        };

        return {
            props: {
                project,
                donations,
            },
        };
    } catch (e) {
        console.error(e);
        throw new Error("Can't fetch project content");
    }
};

export const getStaticPaths = async () => {
    const uids = await fetchAllUids("allProjects");

    return {
        paths: uids.map(uid => ({
            params: { projectId: uid },
        })),
        fallback: "blocking",
    };
};

export default ProjectDetailsPage;
