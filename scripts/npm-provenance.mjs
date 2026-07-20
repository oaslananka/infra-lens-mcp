export const SLSA_PROVENANCE_V1 = 'https://slsa.dev/provenance/v1';

export function integritySha512Hex(integrity) {
  if (typeof integrity !== 'string' || !integrity.startsWith('sha512-')) return null;
  try {
    return Buffer.from(integrity.slice('sha512-'.length), 'base64').toString('hex');
  } catch {
    return null;
  }
}

export function parseNpmProvenance(document, packageName, version) {
  const expectedSubject = `pkg:npm/${packageName}@${version}`;
  const attestations = Array.isArray(document?.attestations) ? document.attestations : [];
  const attestation = attestations.find(
    (entry) => entry?.predicateType === SLSA_PROVENANCE_V1 && entry?.bundle?.dsseEnvelope?.payload
  );

  if (!attestation) {
    return {
      exists: false,
      predicateType: null,
      repository: null,
      commit: null,
      workflowPath: null,
      ref: null,
      eventName: null,
      invocationId: null,
      subjectName: null,
      subjectSha512: null
    };
  }

  const statement = JSON.parse(
    Buffer.from(attestation.bundle.dsseEnvelope.payload, 'base64').toString('utf8')
  );
  const buildDefinition = statement?.predicate?.buildDefinition;
  const workflow = buildDefinition?.externalParameters?.workflow;
  const github = buildDefinition?.internalParameters?.github;
  const dependency = buildDefinition?.resolvedDependencies?.find(
    (entry) => typeof entry?.digest?.gitCommit === 'string'
  );
  const subject = statement?.subject?.find((entry) => entry?.name === expectedSubject);

  return {
    exists: true,
    predicateType: statement?.predicateType ?? attestation.predicateType ?? null,
    repository: workflow?.repository ?? null,
    commit: dependency?.digest?.gitCommit ?? null,
    workflowPath: workflow?.path ?? null,
    ref: workflow?.ref ?? null,
    eventName: github?.event_name ?? null,
    invocationId: statement?.predicate?.runDetails?.metadata?.invocationId ?? null,
    subjectName: subject?.name ?? null,
    subjectSha512: subject?.digest?.sha512 ?? null
  };
}
